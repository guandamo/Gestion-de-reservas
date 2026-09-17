/**
 * Helpers de fechas para reportes.
 * Aceptan string "YYYY-MM" o un Date (para "mes actual").
 */

export function startOfMonth(arg) {
  const d = parseArg(arg);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
}

export function endOfMonth(arg) {
  const d = parseArg(arg);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
}

export function startOfDay(arg = new Date()) {
  const d = new Date(arg);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(arg = new Date()) {
  const d = new Date(arg);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Devuelve la fecha máxima permitida para reservar:
 * el mismo día del mes siguiente a `referenceDate`.
 *
 * Si el mes siguiente tiene menos días (ej. 31/01 → 28/02),
 * cae al último día de ese mes (31/01 → 28/02 en no bisiesto,
 * 31/01 → 29/02 en bisiesto).
 *
 * Devuelve Date UTC con hora 00:00:00.000.
 */
export function maxReservaDate(referenceDate = new Date()) {
  const ref = new Date(referenceDate);
  const day = ref.getUTCDate();
  const nextMonthIndex = ref.getUTCMonth() + 1;
  const nextYear = ref.getUTCFullYear() + Math.floor(nextMonthIndex / 12);
  const monthIndex = nextMonthIndex % 12;
  // último día del mes siguiente: día 0 del mes siguiente al siguiente
  const lastDayNextMonth = new Date(
    Date.UTC(nextYear, monthIndex + 1, 0),
  ).getUTCDate();
  const cappedDay = Math.min(day, lastDayNextMonth);
  return new Date(Date.UTC(nextYear, monthIndex, cappedDay, 0, 0, 0, 0));
}

/**
 * Indica si una fecha (Date o string YYYY-MM-DD) está dentro del
 * rango permitido para reservar: hoy ≤ fecha ≤ maxReservaDate.
 */
export function isWithinReservaRange(fecha, referenceDate = new Date()) {
  const target = new Date(fecha);
  if (Number.isNaN(target.getTime())) return false;
  target.setUTCHours(0, 0, 0, 0);

  const hoy = startOfDay(referenceDate);
  const max = maxReservaDate(referenceDate);
  return target.getTime() >= hoy.getTime() && target.getTime() <= max.getTime();
}

function parseArg(arg) {
  if (arg instanceof Date) return arg;
  if (typeof arg === "string" && /^\d{4}-\d{2}$/.test(arg)) {
    const [y, m] = arg.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1));
  }
  throw new Error(
    "Formato inválido. Usar YYYY-MM o una fecha válida (ej. '2026-09')",
  );
}
