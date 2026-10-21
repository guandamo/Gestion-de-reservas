import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { createAuditLog } from "../audit/createAuditLog.js";
import { MAX_RESERVAS_POR_TANDA } from "../../config/expiracion.js";

/**
 * Cancela las reservas PENDIENTE que superaron su `vencimientoAt` y libera
 * el Turno asociado.
 *
 * Invariantes:
 *  - **Idempotente.** Cada escritura usa `updateMany` condicional por estado. Si
 *    la fila ya no está `PENDIENTE` (el webhook la confirmó, o el usuario la
 *    canceló a mano), `count === 0` y no se modifica nada. Correr el barrido N
 *    veces seguidas produce el mismo resultado que correrlo una.
 *  - **Transaccional.** Cancelar la reserva, decidir la liberación del turno y
 *    escribir la auditoría ocurren en la misma transacción.
 *  - **No pisa a otro usuario.** Antes de liberar el turno se verifica que no
 *    exista otra reserva activa sobre el mismo Turno; y el `updateMany` del
 *    turno exige `estado = 'RESERVADO'`, así que jamás se roba un turno que ya
 *    volvió a ser tomado.
 *  - **No borra nada.** Solo cambia estados y agrega filas de auditoría.
 *
 * @returns {Promise<{revisadas:number, expiradas:number, turnosLiberados:number}>}
 */
export async function expirarReservasPendientes() {
  const ahora = new Date();

  const candidatas = await prisma.reserva.findMany({
    where: {
      estado: "PENDIENTE",
      vencimientoAt: { lte: ahora },
    },
    select: { id: true, idTurno: true },
    take: MAX_RESERVAS_POR_TANDA,
    orderBy: { vencimientoAt: "asc" },
  });

  let expiradas = 0;
  let turnosLiberados = 0;

  for (const candidata of candidatas) {
    try {
      // `true` = se expiró y además se liberó el turno.
      // `false` = se expiró, el turno quedó para otra reserva.
      // `null` = alguien se adelantó; no se escribe nada.
      const turnoLiberado = await expirarUna(candidata, ahora);

      if (turnoLiberado === null) continue;

      expiradas += 1;
      if (turnoLiberado) turnosLiberados += 1;
    } catch (error) {
      // Una reserva conflictiva no puede abortar el resto de la tanda:
      // se registra y se sigue con la siguiente.
      console.error("[sweep] Falló al expirar una reserva", {
        idReserva: candidata.id,
        mensaje: error?.message,
      });
    }
  }

  return {
    revisadas: candidatas.length,
    expiradas,
    turnosLiberados,
  };
}

async function expirarUna({ id, idTurno }, ahora) {
  return prisma.$transaction(
    async (tx) => {
      // (a) Flip condicional. Si el webhook de MP ya confirmó la reserva,
      // esta fila no está PENDIENTE y `count` vale 0.
      const cancelada = await tx.reserva.updateMany({
        where: {
          id,
          estado: "PENDIENTE",
          vencimientoAt: { lte: ahora },
        },
        data: {
          estado: "CANCELADA",
          cancelledAt: ahora,
        },
      });

      if (cancelada.count !== 1) return null;

      // (b) ¿Existe otra reserva viva sobre este turno? Si sí, el turno
      // sigue siendo suyo y no se toca.
      const otraActiva = await tx.reserva.findFirst({
        where: {
          idTurno,
          id: { not: id },
          estado: { in: ["PENDIENTE", "CONFIRMADA"] },
        },
        select: { id: true },
      });

      let liberado = false;

      if (!otraActiva) {
        // También condicional: si el turno ya volvió a RESERVADO (otro usuario
        // lo tomó entre la lectura y esta escritura), count vale 0 y no pasa nada.
        const actualizado = await tx.turno.updateMany({
          where: { id: idTurno, estado: "RESERVADO" },
          data: { estado: "DISPONIBLE" },
        });

        liberado = actualizado.count === 1;
      }

      await createAuditLog({
        entity: "Reserva",
        entityId: id,
        operation: "EXPIRE_RESERVATION",
        performedBy: null,
        oldValues: {
          estado: "PENDIENTE",
          estadoTurno: "RESERVADO",
        },
        newValues: {
          estado: "CANCELADA",
          motivo: "VENCIMIENTO_SIN_PAGO",
          cancelledAt: ahora.toISOString(),
          turnoLiberado: liberado,
        },
        tx,
      });

      return liberado;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}