/**
 * Configuración del vencimiento de reservas pendientes de pago.
 *
 * El plazo se calcula SIEMPRE en el backend: React no decide ni libera nada,
 * solo informa. Si el usuario cierra el pestaña o el backend se reinicia, el
 * barrido periódico (`src/jobs/index.js`) sigue siendo el que libera el turno.
 */

function leerNumero(nombre, porDefecto, minimo) {
  const crudo = process.env[nombre];

  if (crudo === undefined || crudo === "") return porDefecto;

  const valor = Number(crudo);

  if (!Number.isFinite(valor) || valor < minimo) {
    console.warn(
      `[expiracion] ${nombre}="${crudo}" no es un número válido (mínimo ${minimo}). ` +
        `Se usa ${porDefecto}.`,
    );
    return porDefecto;
  }

  return valor;
}

/** Plazo para completar el pago antes de liberar el turno. Default: 3 minutos. */
export const EXPIRACION_RESERVA_MS = leerNumero(
  "RESERVATION_EXPIRATION_MS",
  3 * 60 * 1000,
  1000,
);

/** Cada cuánto se ejecuta el barrido. Default: 30 segundos. */
export const INTERVALO_SWEEP_MS = leerNumero(
  "RESERVATION_SWEEP_INTERVAL_MS",
  30 * 1000,
  1000,
);

/** Tope de reservas procesadas por tanda, para no retener la transacción. */
export const MAX_RESERVAS_POR_TANDA = leerNumero(
  "RESERVATION_SWEEP_BATCH_SIZE",
  200,
  1,
);