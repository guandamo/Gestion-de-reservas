/**
 * Mapa de rutas por rol — fuente única de verdad.
 *
 * Tiene que calcar exactamente los prefijos que declara `App.jsx` al envolver
 * cada layout en un `ProtectedRoute`:
 *
 *   <ProtectedRoute requireRole="ADMIN">   → /admin
 *   <ProtectedRoute requireRole="USUARIO"> → /user
 *
 * Si se agrega un rol o se mueve un árbol de rutas, se actualiza acá y en
 * `App.jsx`. `Login.jsx` lo usa para decidir si el `from` guardado es
 * alcanzable por la sesión que se acaba de crear; `ProtectedRoute.jsx` lo usa
 * para mandar a cada rol a su propio inicio.
 */

/** A dónde entra cada rol después de un login exitoso. */
export const INICIO_POR_ROL = {
    ADMIN: '/admin',
    USUARIO: '/user',
};

/** Prefijos de ruta que puede abrir cada rol. */
export const PREFIJOS_POR_ROL = {
    ADMIN: ['/admin'],
    USUARIO: ['/user'],
};

/**
 * ¿Puede el rol abrir esta ruta?
 *
 * La comparación exige el `/` después del prefijo para que `/administrador`
 * no cuente como si fuera `/admin`.
 */
export function rolPuedeVer(rol, path) {
    const prefijos = PREFIJOS_POR_ROL[rol];
    if (!prefijos || typeof path !== 'string') return false;
    return prefijos.some((p) => path === p || path.startsWith(`${p}/`));
}