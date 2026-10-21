import { crearPreferenciaPago } from "../services/pago/crearPreferenciaPago.js";
import { procesarWebhookPago } from "../services/pago/procesarWebhookPago.js";
import { consultarEstadoPago } from "../services/pago/consultarEstadoPago.js";

export async function createPaymentPreference(req, res) {
  const resultado = await crearPreferenciaPago({
    idReserva: req.body?.idReserva,
    idUsuario: req.user.id,
  });

  return res.status(201).json(resultado);
}

/**
 * Estado real de un pago, verificado contra Mercado Pago.
 *
 * Es lo que consulta la pantalla de retorno (`/pago/exito`, `/pago/pendiente`,
 * `/pago/fallo`) cuando el usuario vuelve del checkout. Los identificadores
 * llegan por query (`payment_id`, `external_reference`) y solo sirven para
 * saber qué consultar: el resultado se lee de la base después de validar el
 * pago contra la API de Mercado Pago.
 */
export async function getPaymentStatus(req, res) {
  const resultado = await consultarEstadoPago({
    idPagoMP: req.query.payment_id ?? req.query.collection_id,
    externalReference: req.query.external_reference,
    idUsuario: req.user.id,
  });

  return res.status(200).json(resultado);
}

export async function receivePaymentWebhook(req, res) {
  // MP manda el ID en la query (data.id); si no, se intenta con el body.
  const rawId = req.query["data.id"] ?? req.body?.data?.id;
  const idPagoMP = rawId === undefined ? undefined : String(rawId);

  // Notificaciones sin data.id (por ejemplo merchant_order): se ignoran con 200
  // para que Mercado Pago no las reintente.
  if (idPagoMP === undefined) {
    console.info("[MP webhook] Ignorado", {
      tipo: req.body?.type ?? req.query.type ?? req.query.topic,
      accion: req.body?.action,
    });
    return res.status(200).json({ resultado: "ignorado" });
  }

  try {
    const resultado = await procesarWebhookPago({ idPagoMP });

    console.info("[MP webhook] Procesado", {
      idPagoMP,
      resultado: resultado.resultado,
    });

    return res.status(200).json(resultado);
  } catch (err) {
    console.error("[MP webhook] Falló", {
      idPagoMP,
      status: err.status ?? 500,
      mensaje: err.status ? err.message : "Error de procesamiento",
    });

    throw err;
  }
}