import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { api, tokenStore, ApiError } from "../api/client.js";

const AuthContext = createContext(null);

const USER_KEY = "gr_user";

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => tokenStore.get());
    const [user, setUser] = useState(() => {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });
    // `ready` se mantiene en el contexto por compatibilidad con la forma
    // anterior del provider, pero nunca se consumió: la validación de sesión
    // es en segundo plano y no frena el render. Por eso es una constante y no
    // estado (antes era un `useState` con un efecto que sólo hacía
    // `setReady(true)`, o sea un no-op).
    const ready = true;

    /**
     * Helper interno: persiste token y usuario en localStorage y estado.
     */
    const persistSession = useCallback((tokenValue, userValue) => {
        tokenStore.set(tokenValue);
        localStorage.setItem(USER_KEY, JSON.stringify(userValue));
        setToken(tokenValue);
        setUser(userValue);
    }, []);

    /**
     * Login. Acepta un AbortSignal para que el caller pueda cancelar
     * un request en vuelo (e.g. al reintentar antes de que termine el primero).
     */
    const login = useCallback(async (email, contrasena, { signal } = {}) => {
        const data = await api.post("/auth/login", { email, contrasena }, { signal });
        persistSession(data.token, data.usuario);
        return data.usuario;
    }, [persistSession]);

    /**
     * Registro público: crea el usuario y deja la sesión iniciada.
     * Espera {nombre, apellido, email, password, confirmPassword}.
     */
    const register = useCallback(async (payload, { signal } = {}) => {
        const data = await api.post("/auth/register", payload, { signal });
        persistSession(data.token, data.usuario);
        return data.usuario;
    }, [persistSession]);

    const logout = useCallback(() => {
        tokenStore.clear();
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
    }, []);

    /**
     * Valida la sesión guardada contra el backend al montar.
     *
     * El JWT dura 1 hora (`loginUsuario.js`, `expiresIn: "1h"`), pero el
     * usuario en localStorage se restauraba sin verificar nunca. Con eso, un
     * token vencido dejaba la app "logueada": las páginas protegidas se veían
     * bien y sólo fallaban al pedir datos, con un 401 por request mostrado
     * como texto en línea. El usuario no se enteraba de que su sesión había
     * muerto hasta la recarga siguiente.
     *
     * Además armaba el rebote del login: la navegación dura de documento
     * re-bootstrapaba el provider desde localStorage, y al eventual rebote
     * el `state.from` quedaba poblado.
     *
     * Reglas:
     *  - Sólo se limpia la sesión ante un 401 explícito del backend. Un
     *    error de red o un 5xx NO desloguean: si el servidor está caído, que
     *    el usuario siga como estaba y reintente.
     *  - No bloquea el render: se valida en segundo plano. `ready` queda en
     *    `true` siempre, como antes.
     *  - Si mientras validaba el usuario hace login de nuevo, el `usuario`
     *    devuelto puede ser de otra cuenta: se descarta con el flag de
     *    cancelación.
     */
    useEffect(() => {
        if (!tokenStore.get()) return;

        const controller = new AbortController();
        let vigente = true;

        (async () => {
            try {
                const { usuario } = await api.get("/auth/me", {
                    signal: controller.signal,
                });
                if (!vigente || !usuario) return;

                // Si en el medio el usuario hizo logout, `tokenStore` está
                // vacío: no se debe resucitar la sesión con este `/auth/me`.
                const tokenActual = tokenStore.get();
                if (!tokenActual) return;

                // El perfil guardado puede tener campos viejos (rol, nombre,
                // estado de suspensión): se refresca desde la fuente.
                persistSession(tokenActual, usuario);
            } catch (err) {
                if (!vigente || err?.name === "AbortError") return;

                if (err instanceof ApiError && err.status === 401) {
                    tokenStore.clear();
                    localStorage.removeItem(USER_KEY);
                    setToken(null);
                    setUser(null);
                }
                // Cualquier otro error (red caída, 5xx) se ignora a propósito:
                // no se tira la sesión de un usuario por un problema de red.
            }
        })();

        return () => {
            vigente = false;
            controller.abort();
        };
    }, [persistSession]);

    const updateUser = useCallback((userValue) => {
        if (!token) return;
        persistSession(token, userValue);
    }, [persistSession, token]);

    const value = useMemo(
        () => ({ token, user, ready, login, register, logout, updateUser }),
        [token, user, ready, login, register, logout, updateUser],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
    return ctx;
}
