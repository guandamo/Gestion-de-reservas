import { Payment } from "mercadopago";
import { mercadoPago } from "../../config/mercadopago.js";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";
import { procesarWebhookPago } from "./procesarWebhookPago.js";

const pagosMP = new Payment(mercadoPago);

/**
 * Reconciliación de un pago contra Mercado Pago.
 *
 * Se invoca cuando el usuario vuelve de la página de checkout. La URL de
 * retorno solo aporta identificadores para saber **qué** consultar: el estado
 * que se devuelve sale de la API de Mercado Pago y de la base de datos, nunca
 * del query string. Llegar a `/pago/exito` no prueba que el pago se haya
 * aprobado.
 *
 * El trabajo pesado (consultar el pago a MP, validar `collector_id`, monto y
 * moneda, confirmar la reserva de forma transaccional e idempotente) ya lo hace
 * `procesarWebhookPago`. Reutilizarlo garantiza que la reconciliación y el
 * webhook produzcan exactamente el mismo efecto sobre la base.
 *
 * @param {object} input
 * @param {string} [input.idPagoMP]           ID del pago en MP (query `payment_id`).
 * @param {string} [input.externalReference]  `external_reference` (= `Pago.id`), como fallback.
 * @param {number} input.idUsuario            del JWT, para verificar la propiedad.
 */
export async function consultarEstadoPago({
  idPagoMP,
  externalReference,
  idUsuario,
} = {}) {
  if (!idUsuario) throw new HttpError(401, "Usuario no autenticado.");

  const id = String(idPagoMP ?? "").trim();
  const referencia = String(externalReference ?? "").trim();

  if (!/^\d+$/.test(id) && !/^[1-9]\d*$/.test(referencia)) {
    throw new HttpError(400, "No se indicó qué pago consultar.");
  }

  const pago = await localizarPago({ id, referencia });

  // Sin pago local no hay nada que confirmar. Se responde 404 para no filtrar
  // información sobre pagos que no son de este usuario.
  if (!pago) {
    throw new HttpError(404, "El pago no existe.");
  }

  // Chequeo de propiedad: sin esto, cualquier usuario autenticado podría
  // inspeccionar pagos ajenos probando identificadores.
  if (pago.reserva.idUsuario !== idUsuario) {
    throw new HttpError(404, "El pago no existe.");
  }

  // Ya acreditado: no hay nada que volver a consultar en MP.
  if (pago.estado === "PAGADO") {
    return { resultado: "ya_procesado", ...(await leerEstado(pago.id)) };
  }

  // Si no vino `payment_id` hay que localizar la operación en Mercado Pago
  // usando la referencia que esta misma app mandó al crearla la preferencia.
  const idOperacion = pago.idMercadoPago ?? (await buscarIdEnMP(pago.id));

  if (!idOperacion) {
    // El usuario volvió pero el pago nunca se llegó a hacer en MP.
    return { resultado: "sin_pago_en_mp", ...(await leerEstado(pago.id)) };
  }

  let resultado;

  try {
    resultado = await procesarWebhookPago({ idPagoMP: idOperacion });
  } catch (error) {
    // Una notificación que no se puede procesar no debe romper la pantalla de
    // retorno: se devuelve el estado real de la base y el frontend lo explica.
    console.warn("[MP] La reconciliación no pudo confirmar el pago", {
      idPagoMP: idOperacion,
      status: error?.status ?? 500,
      mensaje: error?.message,
    });

    resultado = { resultado: "no_confirmado" };
  }

  return {
    resultado: resultado?.resultado ?? "no_confirmado",
    ...(await leerEstado(pago.id)),
  };
}

/**
 * Localiza el Pago local por `idMercadoPago` (camino normal) o, si el usuario
 * volvió sin `payment_id`, por el `id` interno que equivale al
 * `external_reference` de la preferencia.
 */
async function localizarPago({ id, referencia }) {
  if (/^\d+$/.test(id)) {
    const porIdMP = await prisma.pago.findFirst({
      where: { idMercadoPago: id },
      include: { reserva: { select: { idUsuario: true } } },
    });

    if (porIdMP) return porIdMP;
  }

  if (/^[1-9]\d*$/.test(referencia)) {
    const idInterno = Number(referencia);

    if (Number.isSafeInteger(idInterno)) {
      return prisma.pago.findUnique({
        where: { id: idInterno },
        include: { reserva: { select: { idUsuario: true } } },
      });
    }
  }

  return null;
}

/**
 * Busca en Mercado Pago el pago asociado a una preferencia nuestra, siguiendo
 * el mismo patrón de paginación que usa `verificarPagoParaCancelar`.
 *
 * Se prioriza el pago aprobado; si no hay ninguno se devuelve el más reciente
 * para poder informar el estado real (rechazado, cancelado, en curso).
 */
async function buscarIdEnMP(idPago) {
  const vendedor = process.env.MP_COLLECTOR_ID?.trim();

  if (!vendedor) return null;

  const encontrados = [];
  let offset = 0;

  while (true) {
    let respuesta;

    try {
      respuesta = await pagosMP.search({
        options: {
          external_reference: String(idPago),
          limit: 100,
          offset,
        },
        requestOptions: { timeout: 10000 },
      });
    } catch {
      console.warn("[MP] No se pudo buscar el pago por external_reference", {
        idPago,
      });
      return null;
    }

    const resultados = respuesta?.results;
    const total = respuesta?.paging?.total;

    if (!Array.isArray(resultados) || !Number.isSafeInteger(total)) return null;

    for (const item of resultados) {
      if (
        String(item?.external_reference) === String(idPago) &&
        String(item?.collector_id) === vendedor
      ) {
        encontrados.push(item);
      }
    }

    offset += resultados.length;

    if (resultados.length === 0 || offset >= total) break;
  }

  if (encontrados.length === 0) return null;

  const aprobado = encontrados.find((item) => item.status === "approved");

  const elegido = aprobado ?? encontrados[encontrados.length - 1];

  return String(elegido.id);
}

async function leerEstado(idPago) {
  const pago = await prisma.pago.findUnique({
    where: { id: idPago },
    include: {
      reserva: {
        select: {
          id: true,
          estado: true,
          vencimientoAt: true,
          turno: {
            select: {
              fecha: true,
              horaInicio: true,
              precio: true,
              cancha: { select: { nombre: true } },
            },
          },
        },
      },
    },
  });

  if (!pago) {
    return {
      estadoPago: null,
      estadoReserva: null,
      idPago: null,
      idReserva: null,
      expiraEnMs: null,
      turno: null,
    };
  }

  return {
    estadoPago: pago.estado,
    estadoReserva: pago.reserva.estado,
    idPago: pago.id,
    idReserva: pago.reserva.id,
    // El frontend puede avisar "te quedan N segundos" sin recalcular nada.
    expiraEnMs: milisegundosRestantes(pago.reserva.vencimientoAt),
    turno: {
      fecha: pago.reserva.turno.fecha,
      horaInicio: horaAString(pago.reserva.turno.horaInicio),
      precio: Number(pago.reserva.turno.precio),
      cancha: pago.reserva.turno.cancha.nombre,
    },
  };
}

function milisegundosRestantes(vencimiento) {
  if (!vencimiento) return null;

  const restante = new Date(vencimiento).getTime() - Date.now();

  return restante > 0 ? restante : 0;
}

function horaAString(t) {
  if (!t) return null;
  if (typeof t === "string") return t.slice(0, 5);

  const d = new Date(t);

  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}