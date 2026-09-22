import { crearPreferenciaPago } from "../services/pago/crearPreferenciaPago.js";

export async function createPaymentPreference(req, res) {
  const resultado = await crearPreferenciaPago({
    idReserva: req.body?.idReserva,
    idUsuario: req.user.id,
  });

  return res.status(201).json(resultado);
}