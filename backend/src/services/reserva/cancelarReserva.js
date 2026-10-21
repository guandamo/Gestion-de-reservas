import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";
import { inicioTurno } from "../../utils/turnoHorario.js";
import { createAuditLog } from "../audit/createAuditLog.js";
import { verificarPagoParaCancelar } from "../pago/verificarPagoParaCancelar.js";

const LIMITE_USUARIO_MS = 24 * 60 * 60 * 1000;

async function leerYValidar(db, reservaId, idUsuario) {
  const usuario = await db.usuario.findUnique({
    where: { id: idUsuario },
    select: { rol: true, activo: true },
  });

  if (!usuario || !usuario.activo) {
    throw new HttpError(401, "Usuario no autenticado.");
  }

  const reserva = await db.reserva.findUnique({
    where: { id: reservaId },
    include: { pago: true, turno: true },
  });

  const esAdmin = usuario.rol === "ADMIN";

  if (!reserva || (!esAdmin && reserva.idUsuario !== idUsuario)) {
    throw new HttpError(404, "La reserva no existe.");
  }

  if (reserva.estado === "CANCELADA") {
    return { usuario, reserva };
  }

  // Un USUARIO sólo cancela reservas pendientes de pago: si ya pagó, el
  // turno es suyo. Un ADMIN además puede cancelar una CONFIRMADA — es lo que
  // necesita el panel para dar de baja una reserva pagada y liberar el turno.
  //
  // El `Pago` queda en PAGADO: el dinero entró de verdad. El reembolso no es
  // automático (no hay integración de refunds), así que se sigue por el
  // AuditLog, que registra `pagoReembolsado: false`.
  const cancelablePorAdmin =
    reserva.estado === "PENDIENTE" || reserva.estado === "CONFIRMADA";

  if (esAdmin) {
    if (!cancelablePorAdmin) {
      throw new HttpError(409, "Esta reserva no se puede cancelar.");
    }
  } else if (reserva.estado !== "PENDIENTE" || reserva.pago?.estado === "PAGADO") {
    throw new HttpError(409, "Una reserva pagada no se puede cancelar.");
  }

  const faltanMs = inicioTurno(reserva.turno).getTime() - Date.now();

  if (!Number.isFinite(faltanMs)) {
    throw new HttpError(409, "El turno no tiene un horario válido.");
  }

  if (faltanMs <= 0) {
    throw new HttpError(409, "El turno ya comenzó o pasó.");
  }

  if (!esAdmin && faltanMs < LIMITE_USUARIO_MS) {
    throw new HttpError(
      409,
      "Solo se puede cancelar hasta 24 horas antes del turno.",
    );
  }

  return { usuario, reserva };
}

export async function cancelarReserva({ idReserva, idUsuario } = {}) {
  if (!idUsuario) {
    throw new HttpError(401, "Usuario no autenticado.");
  }

  const reservaId = Number(idReserva);

  if (!Number.isSafeInteger(reservaId) || reservaId <= 0) {
    throw new HttpError(400, "El ID de reserva no es válido.");
  }

  const previa = await leerYValidar(prisma, reservaId, idUsuario);

  if (previa.reserva.estado === "CANCELADA") {
    return {
      resultado: "ya_cancelada",
      idReserva: reservaId,
    };
  }

  // `verificarPagoParaCancelar` consulta Mercado Pago para detectar un pago
  // aprobado cuyo webhook nunca llegó. Sólo tiene sentido para una reserva
  // PENDIENTE: si ya está CONFIRMADA el pago está cobrado y el admin está
  // cancelando a propósito. Además el servicio rechaza explícitamente los
  // pagos en estado PAGADO, así que llamarlo acá bloquearía la cancelación
  // que el panel necesita.
  const reservaYaPagada = previa.reserva.estado === "CONFIRMADA";

  if (!reservaYaPagada) {
    await verificarPagoParaCancelar(previa.reserva.pago);
  }

  return prisma.$transaction(async (tx) => {
    const { usuario, reserva } = await leerYValidar(
      tx,
      reservaId,
      idUsuario,
    );

    if (reserva.estado === "CANCELADA") {
      return {
        resultado: "ya_cancelada",
        idReserva: reserva.id,
      };
    }

    // Si apareció otro registro de pago durante la consulta, verificar
    // nuevamente mediante una nueva solicitud.
    if (reserva.pago?.id !== previa.reserva.pago?.id) {
      throw new HttpError(
        409,
        "El pago de la reserva cambió. Intentá cancelar nuevamente.",
      );
    }

    // Si la reserva estaba PENDIENTE en la lectura previa y el webhook la
    // confirmó entre medio, la verificación con Mercado Pago de arriba se
    // salteó y no podemos garantizar el estado real del pago. Se rechaza
    // para que el panel recargue y el admin vea el estado nuevo.
    if (reserva.estado === "CONFIRMADA" && !reservaYaPagada) {
      throw new HttpError(
        409,
        "La reserva se acaba de confirmar. Actualizá la lista.",
      );
    }

    const ahora = new Date();

    const actualizada = await tx.reserva.updateMany({
      where: {
        id: reserva.id,
        estado: { in: ["PENDIENTE", "CONFIRMADA"] },
      },
      data: {
        estado: "CANCELADA",
        cancelledAt: ahora,
      },
    });

    if (actualizada.count !== 1) {
      throw new HttpError(
        409,
        "La reserva cambió de estado. Actualizá la lista.",
      );
    }

    const otraActiva = await tx.reserva.findFirst({
      where: {
        idTurno: reserva.idTurno,
        id: { not: reserva.id },
        estado: { in: ["PENDIENTE", "CONFIRMADA"] },
      },
      select: { id: true },
    });

    if (!otraActiva) {
      await tx.turno.update({
        where: { id: reserva.idTurno },
        data: { estado: "DISPONIBLE" },
      });
    }

    await createAuditLog({
      entity: "Reserva",
      entityId: reserva.id,
      // Se distingue la cancelación administrativa de una reserva pagada de
      // la cancelación normal: es la única que deja plata cobrada sin turno,
      // y por eso tiene que poder filtrarse en el historial.
      operation: reserva.estado === "CONFIRMADA"
        ? "ADMIN_CANCEL_CONFIRMED_RESERVATION"
        : "CANCEL_RESERVATION",
      performedBy: idUsuario,
      oldValues: {
        estado: reserva.estado,
        estadoTurno: reserva.turno.estado,
      },
      newValues: {
        estado: "CANCELADA",
        rolCancelador: usuario.rol,
        cancelledAt: ahora.toISOString(),
        turnoLiberado: !otraActiva,
        // El `Pago` queda en PAGADO a propósito: no hay reembolso automático.
        // Si alguna vez lo hay, este flag es el que lo registra.
        ...(reserva.estado === "CONFIRMADA" ? { pagoReembolsado: false } : {}),
      },
      tx,
    });

    return {
      resultado: "cancelada",
      idReserva: reserva.id,
      turnoLiberado: !otraActiva,
    };
  });
}