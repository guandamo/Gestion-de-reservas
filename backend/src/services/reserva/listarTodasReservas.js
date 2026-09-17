import { prisma } from "../../config/prisma.js";

/**
 * Lista TODAS las reservas del sistema (uso exclusivo ADMIN).
 * Acepta filtros: ?estado=PENDIENTE|CONFIRMADA|CANCELADA
 *                 ?idCancha=ID
 *                 ?desde=YYYY-MM-DD  ?hasta=YYYY-MM-DD  (filtra por fecha del turno)
 */
export async function listarTodasReservas({ estado, idCancha, desde, hasta } = {}) {
  const where = {};
  if (estado) where.estado = String(estado).toUpperCase();

  const turnoWhere = {};
  if (idCancha) turnoWhere.idCancha = Number(idCancha);
  if (desde || hasta) {
    turnoWhere.fecha = {};
    if (desde) {
      const d = parseFecha(desde);
      if (d) turnoWhere.fecha.gte = d;
    }
    if (hasta) {
      const h = parseFecha(hasta);
      if (h) turnoWhere.fecha.lte = h;
    }
  }
  if (Object.keys(turnoWhere).length) where.turno = turnoWhere;

  const reservas = await prisma.reserva.findMany({
    where,
    include: {
      turno: { include: { cancha: { include: { tipoCancha: true } } } },
      usuario: {
        select: { id: true, nombre: true, apellido: true, email: true },
      },
    },
    orderBy: [
      { turno: { fecha: "desc" } },
      { turno: { horaInicio: "desc" } },
    ],
    take: 500,
  });

  return reservas.map((r) => ({
    id: r.id,
    estado: r.estado,
    fechaAlta: r.fechaAlta,
    cancelledAt: r.cancelledAt,
    usuario: r.usuario
      ? {
          id: r.usuario.id,
          nombre: r.usuario.nombre,
          apellido: r.usuario.apellido,
          email: r.usuario.email,
        }
      : null,
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

function parseFecha(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
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
