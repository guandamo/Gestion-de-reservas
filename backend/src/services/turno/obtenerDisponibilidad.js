import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";
import { maxReservaDate, startOfDay } from "../../utils/dates.js";

/**
 * Lista los turnos de una cancha en un rango de fechas, con la reserva activa
 * asociada (si existe) para que el front pueda diferenciar
 * "Reservado" vs "Pendiente de pago".
 *
 * Rango permitido: hoy → mismo día del mes siguiente.
 *
 * @param {object} input
 * @param {number} input.idCancha
 * @param {string} input.desde  YYYY-MM-DD (inclusive)
 * @param {string} input.hasta  YYYY-MM-DD (inclusive)
 */
export async function obtenerDisponibilidad({ idCancha, desde, hasta } = {}) {
  if (!idCancha || Number.isNaN(Number(idCancha))) {
    throw new HttpError(400, "Falta idCancha.");
  }

  const hoy = startOfDay();
  const maxFecha = maxReservaDate(hoy);

  // Defaults: rango completo permitido (hoy → mismo día mes siguiente)
  const desdeDate = parseFecha(desde) ?? hoy;
  let hastaDate = parseFecha(hasta) ?? maxFecha;

  // 'desde' no puede ser anterior a hoy
  if (desdeDate < hoy) {
    throw new HttpError(
      400,
      "La fecha de inicio no puede ser anterior a hoy.",
    );
  }

  // 'hasta' se clipea al máximo permitido (ignora petición fuera de rango)
  if (hastaDate > maxFecha) {
    hastaDate = maxFecha;
  }

  if (hastaDate < desdeDate) {
    throw new HttpError(400, "'hasta' no puede ser anterior a 'desde'.");
  }

  const cancha = await prisma.cancha.findUnique({
    where: { id: Number(idCancha) },
    include: { tipoCancha: true },
  });
  if (!cancha) throw new HttpError(404, "Cancha no encontrada.");
  if (!cancha.activa) throw new HttpError(400, "La cancha está inactiva.");

  const turnos = await prisma.turno.findMany({
    where: {
      idCancha: cancha.id,
      fecha: { gte: desdeDate, lte: hastaDate },
    },
    include: {
      reservas: {
        where: { estado: { in: ["PENDIENTE", "CONFIRMADA"] } },
        select: {
          id: true,
          estado: true,
          fechaAlta: true,
          idUsuario: true,
          usuario: {
            select: { id: true, nombre: true, apellido: true },
          },
        },
        take: 1,
      },
    },
    orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
  });

  return {
    cancha: {
      id: cancha.id,
      nombre: cancha.nombre,
      activa: cancha.activa,
      horaInicio: toHHMM(cancha.horaInicio),
      horaFin: toHHMM(cancha.horaFin),
      precioTurno: Number(cancha.precioTurno),
      tipo: cancha.tipoCancha
        ? { id: cancha.tipoCancha.id, descripcion: cancha.tipoCancha.descripcion }
        : null,
    },
    rango: {
      desde: desdeDate.toISOString().slice(0, 10),
      hasta: hastaDate.toISOString().slice(0, 10),
      maxPermitida: maxFecha.toISOString().slice(0, 10),
    },
    turnos: turnos.map((t) => ({
      id: t.id,
      fecha: t.fecha.toISOString().slice(0, 10),
      horaInicio: toHHMM(t.horaInicio),
      horaFin: sumarUnaHora(t.horaInicio),
      precio: Number(t.precio),
      estado: t.estado, // DISPONIBLE | RESERVADO
      reservaActiva: t.reservas[0]
        ? {
            id: t.reservas[0].id,
            estado: t.reservas[0].estado, // PENDIENTE | CONFIRMADA
            fechaAlta: t.reservas[0].fechaAlta,
            idUsuario: t.reservas[0].idUsuario,
            usuario: t.reservas[0].usuario,
          }
        : null,
    })),
  };
}

function parseFecha(s) {
  if (!s || typeof s !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new HttpError(400, "Formato de fecha inválido. Usar YYYY-MM-DD.");
  }
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, "Fecha inválida.");
  }
  return date;
}

function toHHMM(dateOrTime) {
  if (!dateOrTime) return null;
  // Prisma devuelve @db.Time como string "HH:MM:SS" o Date
  if (typeof dateOrTime === "string") return dateOrTime.slice(0, 5);
  const d = new Date(dateOrTime);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function sumarUnaHora(time) {
  const hhmm = toHHMM(time);
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + 60;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
