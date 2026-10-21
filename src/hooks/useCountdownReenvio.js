import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useCountdownReenvio
 *
 * Cuenta regresiva (en segundos) que se reinicia cuando el usuario pide
 * "reenviar código". Diseñada para reutilizarse desde
 * `ModalVerificacionEmail`.
 *
 * Comportamiento:
 *  - Arranca en `duracionSegundos` (def. 90) cuando `open` pasa a `true`,
 *    o cuando se llama a `reiniciar()`.
 *  - Formato de salida `mm:ss` (def. `01:30`).
 *  - `activo === true` solo mientras el contador es > 0.
 *  - Gated por `open`: si el modal se cierra, pausamos el tick (el contador
 *    no avanza en segundo plano). Al reabrir, el valor pausado se conserva
 *    si todavía no llegó a 0.
 *  - Un único `setInterval` por ciclo de apertura (limpiado en cleanup).
 *  - Hook "tonto": no muestra nada, solo expone `{ segundos, restante, activo,
 *    formateado, reiniciar }`.
 *
 * @param {object}  opts
 * @param {boolean} opts.open                      ¿El consumidor está abierto?
 * @param {number} [opts.duracionSegundos=90]       Total del contador.
 * @returns {{
 *   segundos: number,       // restante numérico
 *   restante: boolean,      // segundos > 0 (alias)
 *   activo: boolean,        // alias de `restante`
 *   formateado: string,     // 'mm:ss'
 *   reiniciar: () => void   // vuelve a `duracionSegundos`
 * }}
 */
export function useCountdownReenvio({ open, duracionSegundos = 90 } = {}) {
    const [segundos, setSegundos] = useState(duracionSegundos);
    const duracionRef = useRef(duracionSegundos);
    const intervalRef = useRef(null);

    // Si cambia la duración, sincronizamos (caso borde de configuración).
    useEffect(() => {
        duracionRef.current = duracionSegundos;
    }, [duracionSegundos]);

    const limpiarIntervalo = useCallback(() => {
        if (intervalRef.current != null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    // Tick único mientras el modal está abierto y quedan segundos.
    useEffect(() => {
        if (!open) {
            limpiarIntervalo();
            return undefined;
        }
        // Si por algún motivo no hay intervalo (p. ej. el consumidor
        // pasó a `open` cuando segundos ya estaba en 0), lo dejamos en 0
        // y no creamos intervalo.
        if (segundos <= 0) {
            return undefined;
        }
        limpiarIntervalo();
        intervalRef.current = setInterval(() => {
            setSegundos((prev) => {
                if (prev <= 1) {
                    limpiarIntervalo();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return limpiarIntervalo;
        // Re-creamos el intervalo cuando `open` o `segundos` cambia, de
        // modo que el ciclo de vida del temporizador siga al del modal.
    }, [open, segundos, limpiarIntervalo]);

    // Limpieza total al desmontar el consumidor (p. ej. cambio de ruta).
    useEffect(() => {
        return () => limpiarIntervalo();
    }, [limpiarIntervalo]);

    const reiniciar = useCallback(() => {
        limpiarIntervalo();
        setSegundos(duracionRef.current);
    }, [limpiarIntervalo]);

    const formateado =
        `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;

    return {
        segundos,
        restante: segundos > 0,
        activo: segundos > 0,
        formateado,
        reiniciar,
    };
}
