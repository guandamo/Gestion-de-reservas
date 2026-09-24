/** 

Supuesto: Turno.fecha y Turno.horaInicio guardan la hora "de pared" del
negocio (Argentina, UTC-3, sin horario de verano). Prisma devuelve la hora
como un Date en 1970-01-01 y la fecha como un Date a medianoche UTC, por lo
que se leen con métodos UTC y luego se convierte el horario argentino a UTC.
const OFFSET_ARGENTINA_HORAS = 3;

*/
function horaYMinutos(t) {
  if (typeof t === "string") {
    const [hh, mm] = t.split(":").map(Number);
    return { hh, mm };
  }

  const d = new Date(t);
  return { hh: d.getUTCHours(), mm: d.getUTCMinutes() };
}

/**
 * Instante real (Date) en que comienza el turno.
 * @param {{ fecha: Date|string, horaInicio: Date|string }} turno
 */
export function inicioTurno({ fecha, horaInicio }) {
  const f = new Date(fecha);
  const { hh, mm } = horaYMinutos(horaInicio);

  return new Date(
    Date.UTC(
      f.getUTCFullYear(),
      f.getUTCMonth(),
      f.getUTCDate(),
      hh + OFFSET_ARGENTINA_HORAS,
      mm,
    ),
  );
}