import { createHash } from "node:crypto";
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
  const idPagoMP = req.query["data.id"];
  const firma = req.get("x-signature");
  const requestId = req.get("x-request-id");

  // Registrar presencia y formato, sin exponer firmas ni secretos.
  const diagnostico = {
    idPagoMP:
      typeof idPagoMP === "string" && /^\d+$/.test(idPagoMP)
        ? idPagoMP
        : null,
    tipoId: typeof idPagoMP,
    tieneIdQuery: idPagoMP !== undefined,
    tieneIdBody: req.body?.data?.id !== undefined,
    coincideId:
      idPagoMP !== undefined &&
      req.body?.data?.id !== undefined &&
      String(idPagoMP) === String(req.body.data.id),
    tieneFirma: Boolean(firma),
    tieneRequestId: Boolean(requestId),
    tieneTs: Boolean(
      firma?.split(",").some((parte) => parte.trim().startsWith("ts=")),
    ),
    tieneV1: Boolean(
      firma?.split(",").some((parte) => parte.trim().startsWith("v1=")),
    ),
  };

  try {
    const resultado = await procesarWebhookPago({
      idPagoMP,
      firma,
      requestId,
    });

    console.info("[MP webhook] Procesado", {
      idPagoMP: diagnostico.idPagoMP,
      resultado: resultado.resultado,
    });

    return res.status(200).json(resultado);
  } catch (err) {
    // Diagnóstico temporal para reproducir un rechazo de firma fuera de Render.
    // La huella permite comparar claves sin registrar la clave secreta.
    if (err.status === 401 && diagnostico.idPagoMP) {
      console.error("[MP webhook] Captura", JSON.stringify({
        fechaCaptura: new Date().toISOString(),
        idPagoMP: diagnostico.idPagoMP,
        xRequestId: requestId,
        xSignature: firma,
        huellaSecreto: createHash("sha256")
          .update(process.env.MP_WEBHOOK_SECRET ?? "")
          .digest("hex")
          .slice(0, 16),
      }));
    }

    console.error("[MP webhook] Falló", {
      ...diagnostico,
      status: err.status ?? 500,
      mensaje: err.status === 401 ? err.message : "Error de procesamiento",
    });

    throw err;
  }
}