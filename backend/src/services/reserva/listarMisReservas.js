import { prisma } from "../../config/prisma.js";
import { inicioTurno } from "../../utils/turnoHorario.js";
import { HttpError } from "../../utils/httpError.js";

/**
 * Lista las reservas (activas y canceladas) del usuario autenticado,
 * con datos del turno y la cancha, ordenadas por fecha de turno descendente.
 */
export async function listarMisReservas({ idUsuario } = {}) {
  if (!idUsuario) {
  throw new HttpError(401, "Usuario no autenticado.");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: idUsuario },
    select: { rol: true, activo: true },
  });

  if (!usuario || !usuario.activo) {
    throw new HttpError(401, "Usuario no autenticado.");
  }

  const esAdmin = usuario.rol === "ADMIN";
  const ahora = Date.now();

  const reservas = await prisma.reserva.findMany({
    where: { idUsuario },
    include: {
      pago: { select: { estado: true } },
      turno: { include: { cancha: { include: { tipoCancha: true } } } },
    }, 
    orderBy: [
      { turno: { fecha: "desc" } },
      { turno: { horaInicio: "desc" } },
    ],
  });

  return reservas.map((r) => ({
    id: r.id,
    estado: r.estado,
    fechaAlta: r.fechaAlta,
    cancelledAt: r.cancelledAt,
    puedeCancelar:
      r.estado === "PENDIENTE" &&
      r.pago?.estado !== "PAGADO" &&
      Number.isFinite(inicioTurno(r.turno).getTime()) &&
      (
        esAdmin
          ? inicioTurno(r.turno).getTime() > ahora
          : inicioTurno(r.turno).getTime() - ahora >= 24 * 60 * 60 * 1000
      ),
    turno: {
      id: r.turno.id,
      fecha: r.turno.fecha,
      horaInicio: horaAString(r.turno.horaInicio),
      horaFin: sumarUnaHora(r.turno.horaInicio),
      precio: Number(r.turno.precio),
    },
    cancha: {
      id: r.turno.cancha.id,
      nombre: r.turno.cancha.nombre,
      tipo: r.turno.cancha.tipoCancha?.descripcion ?? null,
    },
  }));
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
