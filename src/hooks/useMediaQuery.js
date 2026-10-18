import { useEffect, useState } from 'react';

/**
 * Hook que devuelve true si el media query CSS coincide.
 *
 * SSR-safe: durante el primer render (servidor) devuelve el valor inicial
 * provisto (default: false) para evitar hydration mismatch. Luego se sincroniza
 * con el cliente vía window.matchMedia.
 *
 * Ejemplo:
 *   const isDesktop = useMediaQuery('(min-width: 1024px)');
 */
export default function useMediaQuery(query, initialValue = false) {
    const [matches, setMatches] = useState(initialValue);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return undefined;
        const mql = window.matchMedia(query);
        const update = () => setMatches(mql.matches);
        update();
        mql.addEventListener('change', update);
        return () => mql.removeEventListener('change', update);
    }, [query]);

    return matches;
}