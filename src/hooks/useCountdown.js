import { useEffect, useState } from 'react';

/**
 * Cuenta regresiva simple a partir de un timestamp objetivo (en ms, epoch).
 *
 *  - Devuelve `segundos` (entero, ceil) hasta llegar a `targetMs`.
 *  - Devuelve `terminado: true` cuando ya pasó o si `targetMs` es null/inválido.
 *  - Se actualiza cada 1 s con `setInterval`.
 *  - Si cambia `targetMs` a futuro, el contador se reinicia solo.
 *  - Acepta también strings ISO (los normaliza con `Date.parse`).
 *
 * SSR-safe: durante el primer render `segundos` es el valor calculado en
 * servidor (no se rompe la hidratación). El efecto solo corre en cliente.
 *
 * Uso:
 *   const { segundos, terminado } = useCountdown(cooldownEndsAt);
 *   if (!terminado) `Reenviar en ${formatMmss(segundos)}`;
 */
export default function useCountdown(targetMs, { onComplete } = {}) {
    const toMs = (t) => {
        if (t == null) return null;
        if (typeof t === 'number') return Number.isFinite(t) ? t : null;
        const d = typeof t === 'string' ? Date.parse(t) : t instanceof Date ? t.getTime() : NaN;
        return Number.isFinite(d) ? d : null;
    };

    const target = toMs(targetMs);
    const computeSeconds = () => {
        if (target == null) return 0;
        const diff = target - Date.now();
        if (diff <= 0) return 0;
        return Math.ceil(diff / 1000);
    };

    const [segundos, setSegundos] = useState(computeSeconds);

    useEffect(() => {
        // Resetear inmediatamente si cambia el target.
        setSegundos(computeSeconds());

        if (target == null) return undefined;
        const diff = target - Date.now();
        if (diff <= 0) {
            onComplete?.();
            return undefined;
        }

        const id = setInterval(() => {
            const remaining = computeSeconds();
            setSegundos(remaining);
            if (remaining <= 0) {
                clearInterval(id);
                onComplete?.();
            }
        }, 1000);

        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target]);

    return { segundos, terminado: target == null || segundos <= 0 };
}

/**
 * Formatea segundos como "m:ss" (m puede ser > 59 si el target está lejos).
 * Usado para mostrar "Podés reenviar en 1:30".
 */
export function formatMmss(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
}