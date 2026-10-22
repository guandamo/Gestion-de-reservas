// jsdom no implementa `ResizeObserver`, que usa el componente `InputOTP`
// (input-otp) para medir las casillas del código de verificación. Se stubbea
// con un no-op: en los tests no hay nada que observar, sólo hace falta que no
// rompa al montar el modal de verificación.
if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
}

// `input-otp` también usa `document.elementFromPoint` en un `setTimeout` para
// detectar el elemento bajo el cursor al medir las casillas. jsdom no lo
// implementa y el error sube como unhandled rejection, ensuciando el reporte y
// capable de producir falsos positivos. Con un stub que devuelve `null` el
// componente toma su camino de "no hay nada debajo".
if (typeof document !== 'undefined' && !document.elementFromPoint) {
    document.elementFromPoint = () => null;
}