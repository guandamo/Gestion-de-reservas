import { Preference } from "mercadopago";
import { mercadoPago } from "../../config/mercadopago.js";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";

const preferencias = new Preference(mercadoPago);

/**
 * Resuelve las tres `back_urls` de la preferencia.
 *
 * Antes esto usaba una única variable (`MP_RETURN_URL`) como success, pending y
 * failure a la vez, lo que dio dos problemas:
 *  1. No se distinguía el resultado del pago al volver a la app.
 *  2. La única URL configurada terminó siendo `https://example.com`, y por eso
 *     el botón «Volver a la tienda» de Mercado Pago abría «No se puede acceder
 *     a este sitio».
 *
 * Ahora cada destino se puede sobreescribir por variable de entorno y, si no
 * está, se deriva de `FRONTEND_URL` + la ruta del SPA que lo maneja.
 *
 * REQUISITO REAL DE MERCADO PAGO (verificado contra la API en Sandbox):
 * aunque los `back_urls` los abra el navegador del usuario, Mercado Pago
 * **descarta silenciosamente** cualquier URL que no sea HTTPS con host público.
 * Con `http://localhost:5173/pago/exito` la preferencia se crea pero vuelve con
 * `success` vacío, y si además está `auto_return: "approved"` la creación falla
 * con el críptico "auto_return invalid. back_url.success must be defined".
 *
 * Por eso acá se valida el requisito en vez de dejar que MP falle con un error
 * que no dice nada: en desarrollo hay que exponer el frontend con un túnel
 * (ngrok / cloudflared) y poner esa URL pública en FRONTEND_URL.
 */

/** Hosts que MP nunca guarda como back_url, aunque el navegador los abra bien. */
const HOSTS_NO_PUBLICOS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

function esHostPublico(hostname) {
  const host = hostname.toLowerCase();

  if (HOSTS_NO_PUBLICOS.has(host)) return false;

  // IPs privadas (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  if (/^10\./.test(host) || /^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;

  return true;
}

function resolverBackUrls() {
  const base = (process.env.FRONTEND_URL || "http://localhost:5173").replace(
    /\/+$/,
    "",
  );

  const urls = {
    success: process.env.MP_RETURN_URL_SUCCESS || `${base}/pago/exito`,
    pending: process.env.MP_RETURN_URL_PENDING || `${base}/pago/pendiente`,
    failure: process.env.MP_RETURN_URL_FAILURE || `${base}/pago/fallo`,
  };

  for (const [destino, valor] of Object.entries(urls)) {
    const variable = `MP_RETURN_URL_${destino.toUpperCase()}`;

    let url;

    try {
      url = new URL(valor);
    } catch {
      throw new HttpError(500, `${variable}="${valor}" no es una URL válida.`);
    }

    if (url.hostname === "example.com") {
      throw new HttpError(
        500,
        `${variable} apunta a example.com, que no aloja la aplicación. ` +
          `Configurala con la URL real del frontend.`,
      );
    }

    if (url.protocol !== "https:" || !esHostPublico(url.hostname)) {
      throw new HttpError(
        500,
        `${variable}="${valor}" no es una URL que Mercado Pago acepte como ` +
          `back_url: necesita HTTPS y un host público. Mercado Pago descarta ` +
          `en silencio las URLs locales (http://localhost:5173), y con ` +
          `auto_return la creación de la preferencia falla. Expone el frontend ` +
          `con un túnel (por ejemplo \`ngrok http 5173\`) y poné esa URL pública ` +
          `en FRONTEND_URL.`,
      );
    }
  }

  return urls;
}

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


  // Destinos a los que MP Sandbox devuelve al usuario. Deben apuntar al frontend:
  // es el navegador del usuario el que las abre, no un servidor de MP.
  const backUrls = resolverBackUrls();

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

  // A diferencia de los `back_urls`, esta URL la solicita el SERVIDOR de Mercado Pago.
  // Un `localhost` nunca es alcanzable desde internet, así que sin túnel el
  // webhook no llega. No es bloqueante: el endpoint de reconciliación
  // (GET /api/payments/:idPago/estado) confirma el pago cuando el usuario vuelve
  // a la app. Solo avisamos para que quede documentado el comportamiento real.
  try {
    if (new URL(notificationUrl).hostname === "localhost") {
      console.warn(
        "[MP] MP_NOTIFICATION_URL es localhost: el webhook de Mercado Pago no " +
          "llegará. El pago se confirmará al volver a la app vía " +
          "GET /api/payments/:idPago/estado. Exponé el backend con un túnel " +
          "(ngrok/cloudflared) para recibir el webhook automáticamente.",
      );
    }
  } catch {
    throw new HttpError(
      500,
      "MP_NOTIFICATION_URL no es una URL válida.",
    );
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
          back_urls: backUrls,
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
    checkoutUrl: preferencia.sandbox_init_point ?? preferencia.init_point,
  };
}