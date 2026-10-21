/**
 * Límites de fecha y mes del negocio (Argentina).
 *
 * El club opera en Argentina, así que "hoy", "este mes" y "el último día del
 * mes" se tienen que resolver contra la hora de pared de Argentina, no contra
 * UTC ni contra la zona del servidor. Este módulo es el único lugar donde se
 * toma esa decisión: el resto del código pide los límites acá y no vuelve a
 * hacer aritmética de zona horaria.
 *
 * Desde 2008 Argentina no aplica horario de verano, así que el offset es fijo
 * (UTC-3) y alcanza con una constante. Si algún día volviera, esta constante
 * habría que reemplazar por un cálculo con `Intl.DateTimeFormat(timeZone:)`.
 */

/** Argentina = UTC-3. `getTimezoneOffset()` devuelve el signo invertido. */
const OFFSET_ARGENTINA_HORAS = 3;
const MS_POR_HORA = 3_600_000;

/**
 * Devuelve un Date cuyos componentes UTC se leen igual que la hora de pared de
 * Argentina del instante dado.
 */
function paredArgentina(instante) {
  return new Date(instante.getTime() - OFFSET_ARGENTINA_HORAS * MS_POR_HORA);
}

/**
 * Año / mes (0-based) / día del instante, en hora de pared de Argentina.
 *
 * `instante` tiene que ser un INSTANTE real. Pasarle una clave de fecha
 * (medianoche UTC, que es lo que devuelven las funciones de acá) devuelve el
 * día anterior, porque la clave todavía tiene que correrse una vez más.
 */
function calendario(instante) {
  const w = paredArgentina(instante);
  return { y: w.getUTCFullYear(), m: w.getUTCMonth(), d: w.getUTCDate() };
}

/** Mes (0-based) y año del argumento: un Date (instante) o un "YYYY-MM". */
function mesDe(arg) {
  if (arg instanceof Date) {
    const { y, m } = calendario(arg);
    return { y, m };
  }
  if (typeof arg === "string" && /^\d{4}-\d{2}$/.test(arg)) {
    const [y, m] = arg.split("-").map(Number);
    return { y, m: m - 1 };
  }
  throw new Error(
    "Formato inválido. Usar YYYY-MM o una fecha válida (ej. '2026-09')",
  );
}

/** Último día del mes `m` (0-based) del año `y`. Maneja el cambio de año. */
function ultimoDiaDelMes(y, m) {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/**
 * Clave de fecha: medianoche UTC de una fecha de calendario.
 *
 * Es lo que se usa para comparar y filtrar contra columnas `date`
 * (`Turno.fecha`), que guardan un día del calendario y no un instante.
 */
function clave(y, m, d) {
  return new Date(Date.UTC(y, m, d));
}

/**
 * Instante absoluto a partir de una hora de pared de Argentina.
 *
 * Argentina está 3 horas DETRÁS de UTC, o sea que para pasar de la hora del
 * reloj a un instante hay que SUMAR el offset. La reserva #192 lo confirma:
 * creada a las 20:17:46 de Argentina quedó guardada como 23:17:46Z.
 */
function instante(y, m, d, hh = 0, mm = 0, ss = 0, ms = 0) {
  return new Date(
    Date.UTC(y, m, d, hh, mm, ss, ms) + OFFSET_ARGENTINA_HORAS * MS_POR_HORA,
  );
}

// ---------------------------------------------------------------------------
// Claves de fecha — para columnas `date` (Turno.fecha)
// ---------------------------------------------------------------------------

/**
 * El día de Argentina, como clave de fecha.
 *
 * Devolver una clave y no un instante es a propósito: se compara y se filtra
 * contra `Turno.fecha`, que es una columna `date`. Si devolviera el instante de
 * las 00:00 de Argentina (03:00Z del mismo día), el turno de HOY —cuya fecha es
 * 00:00Z— quedaría "en el pasado" y no se podría reservar.
 */
export function startOfDay(arg = new Date()) {
  const { y, m, d } = calendario(new Date(arg));
  return clave(y, m, d);
}

/**
 * Último instante del día de Argentina, como clave de fecha.
 *
 * Para columnas `date` el filtro queda `{ gte: startOfDay(), lte: endOfDay() }`
 * y alcanza con devolver la misma clave: `lte` sobre una columna `date` incluye
 * el día entero. Devolver 23:59:59.999 no aportaba nada y mezclaba dos tipos.
 */
export function endOfDay(arg = new Date()) {
  const { y, m, d } = calendario(new Date(arg));
  return clave(y, m, d);
}

/**
 * Clave de fecha del día de Argentina desplazado `dias`.
 * `Date.UTC` resuelve solo el desborde de mes y de año.
 */
export function fechaClave(dias = 0, desde = new Date()) {
  const { y, m, d } = calendario(new Date(desde));
  return clave(y, m, d + dias);
}

/**
 * Fecha máxima permitida para reservar, como clave: el mismo día del mes
 * siguiente al de referencia.
 *
 * Si el mes siguiente tiene menos días (ej. 31/01 → 28/02), cae al último día
 * de ese mes.
 */
export function maxReservaDate(referenceDate = new Date()) {
  const { y, m, d } = calendario(new Date(referenceDate));
  const cappedDay = Math.min(d, ultimoDiaDelMes(y, m + 1));
  return clave(y, m + 1, cappedDay);
}

/**
 * ¿La fecha cae dentro del rango permitido (hoy → mismo día del mes siguiente)?
 *
 * Trabaja con claves de fecha de punta a punta: `fecha` es un `Turno.fecha`
 * (columna `date`) y los límites también.
 */
export function isWithinReservaRange(fecha, referenceDate = new Date()) {
  const target = new Date(fecha);
  if (Number.isNaN(target.getTime())) return false;
  target.setUTCHours(0, 0, 0, 0);

  const hoy = startOfDay(referenceDate);
  const max = maxReservaDate(referenceDate);
  return target.getTime() >= hoy.getTime() && target.getTime() <= max.getTime();
}

// ---------------------------------------------------------------------------
// Instantes — para columnas timestamptz (Reserva.fechaAlta, Pago.fechaPago)
// ---------------------------------------------------------------------------

/**
 * Instante en que arranca el mes, a las 00:00 de Argentina.
 *
 * A diferencia de `startOfDay`, esto devuelve un INSTANTE y no una clave: se
 * usa contra columnas de instante. Sin el corrimiento, el mes arrancaría a las
 * 00:00Z, tres horas antes de la medianoche real del negocio.
 */
export function startOfMonth(arg) {
  const { y, m } = mesDe(arg);
  return instante(y, m, 1);
}

/**
 * Instante en que termina el mes, a las 23:59:59.999 de Argentina.
 *
 * El día del mes se resuelve ANTES de restar el offset: hacer `Date.UTC(y, m+1,
 * 0, 23, 59, 59, 999) - 3h` daría las 20:59 del último día y dejaría fuera los
 * pagos de las 22:00 del 31.
 */
export function endOfMonth(arg) {
  const { y, m } = mesDe(arg);
  return instante(y, m, ultimoDiaDelMes(y, m), 23, 59, 59, 999);
}