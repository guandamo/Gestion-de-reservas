import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";

/**
 * Devuelve el detalle de una reserva.
 * - ADMIN puede ver cualquier reserva.
 * - USUARIO solo puede ver las propias.
 */
export async function obtenerReserva({ idReserva, idUsuario, rol } = {}) {
  const id = Number(idReserva);
  if (!id) throw new HttpError(400, "idReserva inválido.");

  const reserva = await prisma.reserva.findUnique({
    where: { id },
    include: {
      turno: { include: { cancha: { include: { tipoCancha: true } } } },
      usuario: {
        select: { id: true, nombre: true, apellido: true, email: true },
      },
      pago: true,
    },
  });

  if (!reserva) throw new HttpError(404, "Reserva no encontrada.");

  // Control de acceso
  if (rol !== "ADMIN" && reserva.idUsuario !== idUsuario) {
    throw new HttpError(403, "No tenés permiso para ver esta reserva.");
  }

  return {
    id: reserva.id,
    estado: reserva.estado,
    fechaAlta: reserva.fechaAlta,
    cancelledAt: reserva.cancelledAt,
    usuario: reserva.usuario
      ? {
          id: reserva.usuario.id,
          nombre: reserva.usuario.nombre,
          apellido: reserva.usuario.apellido,
          email: reserva.usuario.email,
        }
      : null,
    turno: {
      id: reserva.turno.id,
      fecha: reserva.turno.fecha,
      horaInicio: horaAString(reserva.turno.horaInicio),
      horaFin: sumarUnaHora(reserva.turno.horaInicio),
      precio: Number(reserva.turno.precio),
    },
    cancha: {
      id: reserva.turno.cancha.id,
      nombre: reserva.turno.cancha.nombre,
      tipo: reserva.turno.cancha.tipoCancha?.descripcion ?? null,
    },
    pago: reserva.pago
      ? {
          id: reserva.pago.id,
          monto: Number(reserva.pago.monto),
          estado: reserva.pago.estado,
          metodo: reserva.pago.metodo,
          fechaPago: reserva.pago.fechaPago,
        }
      : null,
  };
}

function horaAString(t) {
  if (!t) return null;
  if (typeof t === "string") return t.slice(0, 5);
  const d = new Date(t);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function sumarUnaHora(time) {
  const hhmm = horaAString(time);
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + 60;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
