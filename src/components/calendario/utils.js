// Helpers compartidos entre Calendario y MobileCalendario.
// Sin imports de React: funciones puras.

/**
 * Genera las filas de horarios según el rango de la cancha (1 hora por turno).
 */
export function generarHorarios(horaInicio, horaFin) {
    if (!horaInicio || !horaFin) return [];
    const [hi, mi] = horaInicio.split(':').map(Number);
    const [hf, mf] = horaFin.split(':').map(Number);
    const start = hi * 60 + mi;
    const end = hf * 60 + mf;
    const out = [];
    for (let m = start; m < end; m += 60) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        out.push(`${hh}:00`);
    }
    return out;
}

/**
 * Devuelve el nombre corto del día en mayúsculas (ej. "LUN", "MAR").
 */
export function formatearDiaCorto(fecha) {
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase().slice(0, 3);
}

/**
 * Devuelve el número de día del mes (ej. 8, 9, 10).
 */
export function formatearNumero(fecha) {
    const d = new Date(fecha + 'T00:00:00');
    return d.getDate();
}

/**
 * Devuelve fecha corta "DD/MM".
 */
export function formatearFechaCorta(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

/**
 * Devuelve fecha larga "DD de mes de YYYY".
 */
export function formatearFechaLarga(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

/**
 * Devuelve el nombre corto del día con la primera letra en mayúscula y
 * sin punto final (ej. "Lun", "Mar", "Mié").
 */
export function formatearDiaCortoCapitalizado(fecha) {
    const d = new Date(fecha + 'T00:00:00');
    const raw = d.toLocaleDateString('es-AR', { weekday: 'short' });
    return raw.charAt(0).toUpperCase() + raw.slice(1).replace('.', '');
}

/**
 * Devuelve la fecha completa en una sola línea:
 * "Lun 8 de Junio, 2026"
 */
export function formatearFechaCortaConAnio(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha + 'T00:00:00');
    const day = d.toLocaleDateString('es-AR', { weekday: 'short' });
    const resto = d.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    const dayCap = day.charAt(0).toUpperCase() + day.slice(1).replace('.', '');
    return `${dayCap} ${resto}`;
}

/**
 * Devuelve el nombre largo del día con la primera letra en mayúscula
 * (ej. "Lunes", "Martes").
 */
export function formatearDiaLargo(fecha) {
    const d = new Date(fecha + 'T00:00:00');
    const raw = d.toLocaleDateString('es-AR', { weekday: 'long' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * El día de HOY en Argentina, como "YYYY-MM-DD".
 *
 * `new Date().toISOString().slice(0, 10)` devuelve la fecha en UTC: entre las
 * 21:00 y las 24:00 de Argentina ya es el día siguiente, así que "ir a hoy" y el
 * resaltado del día corriente dejaban de encontrarlo. El locales de Argentina
 * va 3h atrás de UTC.
 *
 * `en-CA` formatea como YYYY-MM-DD, que es justo lo que espera el backend.
 */
export function hoyEnArgentina() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date());
}