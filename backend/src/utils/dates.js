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
