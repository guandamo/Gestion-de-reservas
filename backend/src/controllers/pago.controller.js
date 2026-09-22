import { crearPreferenciaPago } from "../services/pago/crearPreferenciaPago.js";
import { procesarWebhookPago } from "../services/pago/procesarWebhookPago.js";

export async function createPaymentPreference(req, res) {
  const resultado = await crearPreferenciaPago({
    idReserva: req.body?.idReserva,
    idUsuario: req.user.id,
  });

  return res.status(201).json(resultado);
}

export async function receivePaymentWebhook(req, res) {
  // El ID de la URL es el que participa en la firma.
  const resultado = await procesarWebhookPago({
    idPagoMP: req.query["data.id"],
    firma: req.get("x-signature"),
    requestId: req.get("x-request-id"),
  });

  return res.status(200).json(resultado);
}