import { Preference } from "mercadopago";
import { mercadoPago } from "../../config/mercadopago.js";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";

const preferencias = new Preference(mercadoPago);

export async function crearPreferenciaPago({ idReserva, idUsuario } = {}) {
  if (!idUsuario) {
    throw new HttpError(401, "Usuario no autenticado.");
  }

  const reservaId = Number(idReserva);

  if (!Number.isSafeInteger(reservaId) || reservaId <= 0) {
    throw new HttpError(400, "El ID de reserva no es válido.");
  }

  // Buscar solamente una reserva del usuario autenticado.
  const reserva = await prisma.reserva.findFirst({
    where: {
      id: reservaId,
      idUsuario,
    },
    include: {
      pago: true,
      turno: {
        include: {
          cancha: true,
        },
      },
    },
  });

  if (!reserva) {
    throw new HttpError(404, "La reserva no existe.");
  }

  if (reserva.estado !== "PENDIENTE") {
    throw new HttpError(409, "La reserva no está pendiente de pago.");
  }

  if (reserva.pago?.estado === "PAGADO") {
    throw new HttpError(409, "La reserva ya está pagada.");
  }

  if (
    reserva.turno.estado !== "RESERVADO" ||
    !reserva.turno.cancha.activa
  ) {
    throw new HttpError(409, "El turno no está habilitado para pagar.");
  }

  if (reserva.pago && reserva.pago.metodo !== "MERCADOPAGO") {
    throw new HttpError(
      409,
      "La reserva tiene un pago registrado con otro método.",
    );
  }


  const returnUrl = process.env.MP_RETURN_URL;

  try {
  const url = new URL(returnUrl);
  if (url.protocol !== "https:") throw new Error("Se requiere HTTPS");
  } catch {
  throw new HttpError(
    500,
    "Configurá MP_RETURN_URL con una URL HTTPS válida.",
  );
  }



  // Conservar el monto si el pago ya existe.
  // Para un pago nuevo, tomar el precio del turno desde la base.
  const monto = reserva.pago?.monto ?? reserva.turno.precio;
  const precio = Number(monto);

  if (!Number.isFinite(precio) || precio <= 0) {
    throw new HttpError(400, "El monto de la reserva no es válido.");
  }

  // Una reserva tiene un único registro Pago.
  // Si ya existe, no cambiar su monto ni su estado.
  const pago = await prisma.pago.upsert({
    where: {
      idReserva: reserva.id,
    },
    update: {},
    create: {
      idReserva: reserva.id,
      monto,
      metodo: "MERCADOPAGO",
      estado: "PENDIENTE",
    },
  });

  if (pago.estado !== "PENDIENTE" || pago.metodo !== "MERCADOPAGO") {
    throw new HttpError(409, "El pago ya no está disponible para iniciar.");
  }

const notificationUrl = process.env.MP_NOTIFICATION_URL;

if (!notificationUrl) {
  throw new HttpError(500, "Falta configurar MP_NOTIFICATION_URL.");
}


  // Esta llamada crea el enlace de checkout; no acredita un pago.
  let preferencia;

  try {
    preferencia = await preferencias.create({
      body: {
        items: [
          {
            id: String(reserva.id),
            title: `Reserva de cancha: ${reserva.turno.cancha.nombre}`,
            quantity: 1,
            currency_id: "ARS",
            unit_price: Number(pago.monto),
          },
        ],
        external_reference: String(pago.id),
          back_urls: {
            success: returnUrl,
            pending: returnUrl,
            failure: returnUrl,
          },
          auto_return: "approved",
          notification_url: notificationUrl,
      },
    });
  } catch {
    throw new HttpError(
      502,
      "No se pudo crear el enlace de Mercado Pago. Intentá nuevamente.",
    );
  }

  return {
    idReserva: reserva.id,
    idPago: pago.id,
    preferenceId: preferencia.id,
    initPoint: preferencia.init_point,
    sandboxInitPoint: preferencia.sandbox_init_point,
  };
}