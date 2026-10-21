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
 * las `back_urls` tienen que ser HTTPS **cuando la preferencia lleva
 * `auto_return`**. Mercado Pago **descarta silenciosamente** cualquier `http://`
 * o dirección privada en ese caso, y después falla con el críptico
 * "auto_return invalid. back_url.success must be defined".
 *
 * O sea que el requisito no depende de NODE_ENV: depende de `auto_return`, que
 * es lo único que decide este servicio (ver `debeUsarAutoReturn`). Con las
 * back_urls en `http://localhost` la preferencia se crea bien, sólo que sin
 * redirección automática y el usuario vuelve apretando «Volver a la tienda».
 *
 * En **desarrollo** (NODE_ENV !== "production") se acepta `http://localhost`
 * además de HTTPS con host público. Sin esa excepción, ningún dev podría
 * probar el flujo sin abrir un túnel. Si necesitás probar MP desde otra IP
 * (por ejemplo desde un celular), exponé el frontend con ngrok o cloudflared
 * y poné esa URL pública en FRONTEND_URL.
 */

/** Hosts que MP nunca guarda como back_url, aunque el navegador los abra bien. */
const HOSTS_NO_PUBLICOS = new Set([
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

/**
 * Indica si la URL dada es aceptable como back_url de Mercado Pago.
 *
 * Regla para producción (`NODE_ENV=production`): tiene que ser HTTPS con un
 * host público; MP descarta silenciosamente cualquier `http://` o dirección
 * privada, y con `auto_return` la creación de la preferencia falla con un
 * error críptico ("auto_return invalid. back_url.success must be defined").
 *
 * Excepción para desarrollo: aceptamos `http://localhost` y `http://127.0.0.1`,
 * que es donde corre Vite. Sin esa escape, ningún dev podría probar el flujo.
 *
 * @returns {{ ok: true } | { ok: false, motivo: string }}
 */
function validarBackUrl(valor) {
  let url;
  try {
    url = new URL(valor);
  } catch {
    return { ok: false, motivo: "no es una URL válida" };
  }

  if (url.hostname === "example.com") {
    return { ok: false, motivo: "apunta a example.com, que no aloja la aplicación" };
  }

  const esProduccion = process.env.NODE_ENV === "production";
  const esLocalhost = url.hostname.toLowerCase() === "localhost";

  if (esProduccion) {
    if (url.protocol !== "https:") {
      return {
        ok: false,
        motivo: "en producción la URL debe ser HTTPS",
      };
    }
    if (!esHostPublico(url.hostname)) {
      return {
        ok: false,
        motivo: "en producción la URL debe tener un host público (no localhost ni IP privada)",
      };
    }
    return { ok: true };
  }

  // Desarrollo: https público o localhost http.
  if (url.protocol === "https:") return { ok: true };

  if (url.protocol === "http:" && esLocalhost) return { ok: true };

  return {
    ok: false,
    motivo:
      "en desarrollo solo se acepta http://localhost o https:// con host público. " +
      "Para probar MP desde otra IP, exponé el frontend con un túnel (ngrok / cloudflared)",
  };
}

/**
 * Decide si la preferencia puede llevar `auto_return: "approved"`.
 *
 * Mercado Pago exige que las `back_urls` sean HTTPS en cuanto se usa
 * `auto_return`. Verificado contra la API en Sandbox (2026-10-21):
 *
 *   http://localhost + auto_return  -> 400 "auto_return invalid.
 *                                       back_url.success must be defined"
 *   http://localhost SIN auto_return -> OK
 *   https://        + auto_return  -> OK
 *
 * El mismo `http://localhost` funciona en las tres situaciones salvo
 * combinado con `auto_return`: MP descarta en silencio las URLs no-HTTPS y
 * después se queja de que no encontró `success`. O sea que el requisito de
 * HTTPS no depende de NODE_ENV sino del propio uso de `auto_return`, y por eso
 * acá se deriva del protocolo real de las URLs y no de una bandera de
 * entorno.
 *
 * Sin `auto_return` el checkout funciona igual: el usuario paga y tiene que
 * apretar "Volver a la tienda", que lo trae de vuelta al `success`. Es la
 * diferencia entre develop y producción.
 */
function debeUsarAutoReturn(backUrls) {
  return Object.values(backUrls).every((url) => url.startsWith("https://"));
}

function resolverBackUrls() {
  const base = (process.env.FRONTEND_URL || "http://localhost:5173").replace(
    /\/+$/,
    "",
  );

  const urls = {
    success: process.env.MP_RETURN_URL_SUCCESS || `${base}/pago/exito`,
    pending: process.env.MP_RETURN_URL_PENDING || `${base}/pago/pendiente`,
    // Los TRES destinos pasan por la misma pantalla de retorno a propósito.
    //
    // `/pago/fallo` es la única ruta que consulta `GET /api/payments/estado`
    // en ese camino, y sin ese chequeo un pago que MP mande acá (abandono del
    // checkout, rechazo, timeout de la pasarela) queda sin confirmar: la
    // reserva sigue PENDIENTE y el barrido la libera a los 3 minutos aunque el
    // usuario haya pagado. En localhost el webhook tampoco rescata esto porque
    // los servidores de MP no alcanzan un localhost.
    //
    // La pantalla muestra el resultado real y a los 6 s manda al usuario a la
    // página de turnos (`/user/reservar`), que es el destino final que se
    // pidió, con un acceso secundario a "Mis reservas" para el que llegó
    // desde un pago pendiente y todavía quiere pagarlo.
    failure: process.env.MP_RETURN_URL_FAILURE || `${base}/pago/fallo`,
  };

  for (const [destino, valor] of Object.entries(urls)) {
    const variable = `MP_RETURN_URL_${destino.toUpperCase()}`;
    const chequeo = validarBackUrl(valor);

    if (!chequeo.ok) {
      throw new HttpError(
        500,
        `${variable}="${valor}" no es aceptable como back_url de Mercado ` +
          `Pago: ${chequeo.motivo}. Configurala con la URL pública del ` +
          `frontend (en producción: HTTPS del Static Site; en desarrollo: ` +
          `http://localhost:5173 sirve, cualquier otra IP requiere un túnel).`,
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

  // La reserva vence EXACTAMENTE a `vencimientoAt`. Si ya pasó, el barrido
  // periódico la va a cancelar (o ya lo hizo) y el turno se va a liberar
  // para otro usuario. Rehusamos explícitamente: dejar que el usuario pague
  // acá terminaría con un cobro para una reserva que ya no le pertenece.
  //
  // El `vencimientoAt` NO se vuelve a setear: cada llamada a este servicio
  // usa el mismo deadline original.
  if (
    reserva.vencimientoAt &&
    reserva.vencimientoAt.getTime() <= Date.now()
  ) {
    throw new HttpError(
      409,
      "La reserva venció. El turno volvió a estar disponible.",
    );
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

  const body = {
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
    notification_url: notificationUrl,
  };

  // Sólo se manda si las back_urls son HTTPS; ver debeUsarAutoReturn.
  if (debeUsarAutoReturn(backUrls)) {
    body.auto_return = "approved";
  } else {
    console.info(
      "[MP] back_urls sin HTTPS: se omite auto_return. El usuario vuelve a la " +
        "app apretando «Volver a la tienda» en el checkout de Mercado Pago.",
    );
  }

  try {
    preferencia = await preferencias.create({ body });
  } catch (error) {
    // El mensaje de MP es la única fuente de diagnóstico (por ejemplo
    // "auto_return invalid. back_url.success must be defined"), así que se
    // loguea acá. Al usuario se le devuelve algo genérico para no filtrar
    // detalles de la integración.
    console.error(
      `[MP] preferences.create falló: ${error?.message ?? error} ` +
        `(status ${error?.status ?? "s/d"}) — back_urls=${JSON.stringify(backUrls)}`,
    );

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