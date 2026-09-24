import { crearReserva } from "../services/reserva/crearReserva.js";
import { listarMisReservas } from "../services/reserva/listarMisReservas.js";
import { listarTodasReservas } from "../services/reserva/listarTodasReservas.js";
import { obtenerReserva } from "../services/reserva/obtenerReserva.js";
import { HttpError } from "../utils/httpError.js";
import { cancelarReserva } from "../services/reserva/cancelarReserva.js";

/**
 * POST /api/reservations
 * Body: { idTurno }
 * Crea una pre-reserva (estado PENDIENTE).
 */
export async function createReservation(req, res) {
  const { idTurno } = req.body ?? {};
  if (!idTurno) throw new HttpError(400, "Falta idTurno.");

  const resultado = await crearReserva({
    idUsuario: req.user.id,
    idTurno,
  });

  return res.status(201).json(resultado);
}

/**
 * GET /api/reservations/my
 * Lista las reservas del usuario autenticado.
 */
export async function getMyReservations(req, res) {
  const items = await listarMisReservas({ idUsuario: req.user.id });
  return res.json({ items });
}

/**
 * GET /api/reservations  (solo ADMIN)
 * Lista todas las reservas con filtros opcionales.
 */
export async function getAllReservations(req, res) {
  const { estado, idCancha, desde, hasta } = req.query;
  const items = await listarTodasReservas({ estado, idCancha, desde, hasta });
  return res.json({ items });
}

/**
 * GET /api/reservations/:id
 * Detalle. ADMIN ve cualquiera; USUARIO solo las propias.
 */
export async function getReservationById(req, res) {
  const detalle = await obtenerReserva({
    idReserva: req.params.id,
    idUsuario: req.user.id,
    rol: req.user.rol,
  });
  return res.json(detalle);
}

/**
 * PATCH /api/reservations/:id/cancel
 * USUARIO cancela su reserva hasta 24 h antes; ADMIN cualquiera hasta el inicio.
 */
export async function cancelReservation(req, res) {
  const resultado = await cancelarReserva({
    idReserva: req.params.id,
    idUsuario: req.user.id,
  });

  return res.json(resultado);
}