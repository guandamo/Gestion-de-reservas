import { createHmac, timingSafeEqual } from "node:crypto";
import { Payment } from "mercadopago";
import { Prisma } from "@prisma/client";
import { mercadoPago } from "../../config/mercadopago.js";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";
import { createAuditLog } from "../audit/createAuditLog.js";

const pagosMP = new Payment(mercadoPago);

function validarFirma({ idPagoMP, firma, requestId }) {
  const secret = process.env.MP_WEBHOOK_SECRET;

  if (!secret) {
    throw new HttpError(500, "Falta configurar MP_WEBHOOK_SECRET.");
  }

  if (
    typeof idPagoMP !== "string" ||
    !/^\d+$/.test(idPagoMP) ||
    typeof firma !== "string" ||
    typeof requestId !== "string" ||
    !requestId
  ) {
    throw new HttpError(401, "Notificación sin firma válida.");
  }

  const partes = firma.split(",").map((parte) => parte.trim());
  const ts = partes.find((parte) => parte.startsWith("ts="))?.slice(3);
  const firmas = partes
    .filter((parte) => parte.startsWith("v1="))
    .map((parte) => parte.slice(3))
    .filter((valor) => /^[a-f0-9]{64}$/i.test(valor));

  if (!ts || !/^\d+$/.test(ts) || firmas.length === 0) {
  console.error("[MP firma] Formato incorrecto", {
    tsNumerico: Boolean(ts && /^\d+$/.test(ts)),
    cantidadFirmasValidas: firmas.length,
  });

  throw new HttpError(401, "Formato de firma incorrecto.");
}
  const mensaje =
    `id:${idPagoMP};request-id:${requestId};ts:${ts};`;

  const esperada = createHmac("sha256", secret)
    .update(mensaje)
    .digest();

  const valida = firmas.some((valor) =>
    timingSafeEqual(Buffer.from(valor, "hex"), esperada),
  );

  if (!valida) {
  console.error("[MP firma] HMAC no coincide", {
    idPagoMP,
    secretoConEspaciosEnExtremos: secret !== secret.trim(),
    requestIdConEspaciosEnExtremos: requestId !== requestId.trim(),
  });

  throw new HttpError(401, "La firma recibida no coincide con la calculada.");
}
}

export async function procesarWebhookPago({
  idPagoMP,
  firma,
  requestId,
}) {
  validarFirma({ idPagoMP, firma, requestId });

  // Consultar la API: no confiar en un estado enviado en el body.
  let pagoMP;

  try {
    pagoMP = await pagosMP.get({ id: idPagoMP });
  } catch {
    // No confirmar recepción si la consulta falló:
    // Mercado Pago podrá reintentar la notificación.
    throw new HttpError(502, "No se pudo consultar el pago.");
  }

  if (String(pagoMP.id) !== idPagoMP) {
    throw new HttpError(409, "El ID del pago no coincide.");
  }

  // Esta implementación confirma pagos aprobados.
  // No revierte pagos por reembolsos o contracargos.
  if (pagoMP.status !== "approved") {
    return { resultado: "sin_cambios", estado: pagoMP.status };
  }

  const referencia = String(pagoMP.external_reference ?? "");
  const idPago = Number(referencia);

  if (
    !/^[1-9]\d*$/.test(referencia) ||
    !Number.isSafeInteger(idPago)
  ) {
    throw new HttpError(409, "El pago no tiene una referencia válida.");
  }

  if (
    pagoMP.currency_id !== "ARS" ||
    typeof pagoMP.transaction_amount !== "number" ||
    !Number.isFinite(pagoMP.transaction_amount) ||
    pagoMP.transaction_amount <= 0 ||
    Number(pagoMP.transaction_amount_refunded ?? 0) > 0
  ) {
    throw new HttpError(409, "Moneda o monto del pago no válido.");
  }

  const fechaPago = new Date(pagoMP.date_approved);

  if (!pagoMP.date_approved || Number.isNaN(fechaPago.getTime())) {
    throw new HttpError(409, "El pago no tiene fecha de aprobación válida.");
  }

  return prisma.$transaction(
    async (tx) => {
      const pago = await tx.pago.findUnique({
        where: { id: idPago },
        include: { reserva: true },
      });

      if (!pago) {
        throw new HttpError(409, "No existe el pago referenciado.");
      }

      if (
        pago.metodo !== "MERCADOPAGO" ||
        !pago.monto.equals(
          new Prisma.Decimal(String(pagoMP.transaction_amount)),
        )
      ) {
        throw new HttpError(409, "El método o monto del pago no coincide.");
      }

      // Una notificación repetida no vuelve a modificar los datos.
      if (pago.estado === "PAGADO") {
        if (pago.idMercadoPago !== idPagoMP) {
          throw new HttpError(
            409,
            "La reserva ya fue abonada mediante otro pago.",
          );
        }

        return { resultado: "ya_procesado" };
      }

      if (
        pago.idMercadoPago &&
        pago.idMercadoPago !== idPagoMP
      ) {
        throw new HttpError(409, "El pago tiene otra operación asociada.");
      }

      if (pago.reserva.estado !== "PENDIENTE") {
        throw new HttpError(
          409,
          "La reserva requiere revisión antes de confirmar el pago.",
        );
      }

      const turno = await tx.turno.findUnique({
        where: { id: pago.reserva.idTurno },
      });

      if (!turno || turno.estado !== "RESERVADO") {
        throw new HttpError(409, "El turno ya no está reservado.");
      }

      await tx.pago.update({
        where: { id: pago.id },
        data: {
          estado: "PAGADO",
          idMercadoPago: idPagoMP,
          fechaPago,
        },
      });

      await tx.reserva.update({
        where: { id: pago.idReserva },
        data: { estado: "CONFIRMADA" },
      });

      await createAuditLog({
        entity: "Reserva",
        entityId: pago.idReserva,
        operation: "CONFIRM_PAYMENT",
        performedBy: null,
        oldValues: {
          estado: pago.reserva.estado,
          estadoPago: pago.estado,
        },
        newValues: {
          estado: "CONFIRMADA",
          estadoPago: "PAGADO",
          idPago: pago.id,
          idMercadoPago: idPagoMP,
        },
        tx,
      });

      return {
        resultado: "confirmado",
        idReserva: pago.idReserva,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}