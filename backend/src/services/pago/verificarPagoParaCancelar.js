import { Payment } from "mercadopago";
import { mercadoPago } from "../../config/mercadopago.js";
import { HttpError } from "../../utils/httpError.js";
import { procesarWebhookPago } from "./procesarWebhookPago.js";

const pagosMP = new Payment(mercadoPago);

export async function verificarPagoParaCancelar(pago) {
  if (!pago) return;

  if (pago.estado === "PAGADO") {
    throw new HttpError(409, "Una reserva pagada no se puede cancelar.");
  }

  if (pago.metodo !== "MERCADOPAGO") return;

  const vendedor = process.env.MP_COLLECTOR_ID?.trim();

  if (!vendedor || !/^[1-9]\d*$/.test(vendedor)) {
    throw new HttpError(500, "Falta configurar un MP_COLLECTOR_ID válido.");
  }

  const encontrados = [];
  let offset = 0;

  while (true) {
    let respuesta;

    try {
      respuesta = await pagosMP.search({
        options: {
          external_reference: String(pago.id),
          limit: 100,
          offset,
        },
        requestOptions: {
          timeout: 10000,
        },
      });
    } catch {
      throw new HttpError(
        502,
        "No se pudo verificar el pago en Mercado Pago. Intentá nuevamente.",
      );
    }

    const resultados = respuesta.results;
    const total = respuesta.paging?.total;

    if (
      !Array.isArray(resultados) ||
      !Number.isSafeInteger(total) ||
      total < 0
    ) {
      throw new HttpError(
        502,
        "La respuesta de Mercado Pago no se pudo verificar.",
      );
    }

    for (const item of resultados) {
      if (
        String(item.external_reference) !== String(pago.id) ||
        String(item.collector_id) !== vendedor
      ) {
        throw new HttpError(
          502,
          "No se pudo verificar la referencia o el vendedor del pago.",
        );
      }

      encontrados.push(item);
    }

    offset += resultados.length;

    if (offset >= total) break;

    if (resultados.length === 0) {
      throw new HttpError(
        502,
        "No se pudieron consultar todos los intentos de pago.",
      );
    }
  }

  const aprobado = encontrados.find((item) => item.status === "approved");

  if (aprobado) {
    // Confirma el pago local usando las validaciones existentes.
    await procesarWebhookPago({
      idPagoMP: String(aprobado.id),
    });

    throw new HttpError(
      409,
      "La reserva tiene un pago aprobado y no se puede cancelar.",
    );
  }

  const enCurso = encontrados.some((item) =>
    ["pending", "in_process", "authorized"].includes(item.status),
  );

  if (enCurso) {
    throw new HttpError(
      409,
      "Hay un pago en curso. Esperá a que se resuelva antes de cancelar.",
    );
  }

  const requiereRevision = encontrados.some(
    (item) => !["rejected", "cancelled"].includes(item.status),
  );

  if (requiereRevision) {
    throw new HttpError(
      409,
      "El estado del pago requiere revisión antes de cancelar.",
    );
  }

  // Sin pagos encontrados, o solo rechazados/cancelados:
  // continuar con la cancelación.
}