import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";
import { maxReservaDate } from "../../utils/dates.js";
import { createAuditLog } from "../audit/createAuditLog.js";
import { inicioTurno } from "../../utils/turnoHorario.js";

/**
 * Crea una pre-reserva para el usuario autenticado.
 * Estado inicial: PENDIENTE (semánticamente equivalente a PENDING_PAYMENT).
 * Marca el Turno como RESERVADO dentro de la misma transacción.
 *
 * Verifica disponibilidad DENTRO de la transacción para evitar race conditions.
 *
 * @param {object} input
 * @param {number} input.idUsuario   del JWT (req.user.id)
 * @param {number} input.idTurno
 */
export async function crearReserva({ idUsuario, idTurno } = {}) {
  if (!idUsuario) throw new HttpError(401, "Usuario no autenticado.");
  
  const turnoId = Number(idTurno);
  if (!Number.isSafeInteger(turnoId) || turnoId <= 0) {
    throw new HttpError(400, "El ID de turno no es válido.");
  }

  const resultado = await prisma.$transaction(async (tx) => {
    // 1) Re-leer el turno con la cancha DENTRO de la transacción
    const turno = await tx.turno.findUnique({
      where: { id: turnoId },
      include: { cancha: { include: { tipoCancha: true } } },
    });

    if (!turno) throw new HttpError(404, "El turno no existe.");
    if (!turno.cancha.activa) {
      throw new HttpError(400, "La cancha está inactiva.");
    }

    // 1.b) Validar rango permitido: hoy → mismo día mes siguiente
    const maxFecha = maxReservaDate();
    const fechaSolo = new Date(turno.fecha);
    fechaSolo.setUTCHours(0, 0, 0, 0);
    if (fechaSolo.getTime() > maxFecha.getTime()) {
      throw new HttpError(
        400,
        "La fecha seleccionada está fuera del rango permitido para reservar.",
      );
    }


    // 2) No permitir reservar turnos que ya comenzaron.
    const fechaTurno = inicioTurno(turno);
    const horaStr = horaAString(turno.horaInicio);

    if (!Number.isFinite(fechaTurno.getTime())) {
      throw new HttpError(400, "El turno no tiene un horario válido.");
    }

    if (fechaTurno.getTime() <= Date.now()) {
      throw new HttpError(
        400,
        "No se puede reservar un turno que ya comenzó o pasó.",
      );
    }

    // 3) El turno debe estar DISPONIBLE
    if (turno.estado !== "DISPONIBLE") {
      throw new HttpError(409, "El turno ya no está disponible.");
    }

    // 4) Defensa adicional: verificar que no haya otra Reserva activa sobre este Turno
    const reservaActiva = await tx.reserva.findFirst({
      where: {
        idTurno: turno.id,
        estado: { in: ["PENDIENTE", "CONFIRMADA"] },
      },
    });
    if (reservaActiva) {
      throw new HttpError(409, "El turno ya está reservado.");
    }

    // 5) Tomar el turno solamente si todavía está disponible.
    const resultadoTurno = await tx.turno.updateMany({
      where: {
        id: turno.id,
        estado: "DISPONIBLE",
      },
      data: {
        estado: "RESERVADO",
      },
    });

    if (resultadoTurno.count !== 1) {
      throw new HttpError(
        409,
        "Otro usuario acaba de reservar este turno. Elegí otro horario.",
      );
    }

    // 6) Crear la reserva después de haber tomado el turno.
    const reserva = await tx.reserva.create({
      data: {
        idUsuario,
        idTurno: turno.id,
        estado: "PENDIENTE",
      },
    });

    // 7) AuditLog
    await createAuditLog({
      entity: "Reserva",
      entityId: reserva.id,
      operation: "CREATE_RESERVATION",
      performedBy: idUsuario,
      oldValues: null,
      newValues: {
        id: reserva.id,
        idUsuario: reserva.idUsuario,
        idTurno: reserva.idTurno,
        estado: reserva.estado,
        fechaAlta: reserva.fechaAlta,
        turno: {
          id: turno.id,
          fecha: turno.fecha,
          horaInicio: horaStr,
          precio: Number(turno.precio),
        },
        cancha: {
          id: turno.cancha.id,
          nombre: turno.cancha.nombre,
        },
      },
      tx,
    });

    return { reserva, turno };
  });

  return {
    success: true,
    reservationId: resultado.reserva.id,
    status: resultado.reserva.estado,
    reserva: {
      id: resultado.reserva.id,
      idTurno: resultado.reserva.idTurno,
      idUsuario: resultado.reserva.idUsuario,
      estado: resultado.reserva.estado,
      fechaAlta: resultado.reserva.fechaAlta,
      turno: {
        id: resultado.turno.id,
        fecha: resultado.turno.fecha,
        horaInicio: horaAString(resultado.turno.horaInicio),
        precio: Number(resultado.turno.precio),
      },
      cancha: {
        id: resultado.turno.cancha.id,
        nombre: resultado.turno.cancha.nombre,
      },
    },
  };
}

function horaAString(t) {
  if (!t) return null;
  if (typeof t === "string") return t.slice(0, 5);
  const d = new Date(t);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
