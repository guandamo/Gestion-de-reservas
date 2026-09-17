import { obtenerDisponibilidad } from "../services/turno/obtenerDisponibilidad.js";

/**
 * GET /api/turnos/availability/:idCancha?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * Disponible para usuarios autenticados (USER o ADMIN).
 */
export async function getDisponibilidad(req, res) {
  const { idCancha } = req.params;
  const { desde, hasta } = req.query;
  const resultado = await obtenerDisponibilidad({ idCancha, desde, hasta });
  return res.json(resultado);
}
