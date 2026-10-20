import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { api, tokenStore } from "../api/client.js";

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
    const [ready, setReady] = useState(true);

    useEffect(() => {
        setReady(true);
    }, []);

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
     * Registro público.
     *
     * Hoy el backend pide verificación por correo (OTP). Hay dos caminos:
     *  1. `data.requiresVerification === true` → devolvemos `data` SIN
     *     persistir sesión. El padre debe mostrar el modal de verificación y,
     *     tras un verify-otp exitoso, llamar a `loginVerificadoUsuario()`.
     *  2. Camino legacy (futuro): si el backend devolviera `data.token` y
     *     `data.usuario` directo (sin requiresVerification), persistimos
     *     sesión automáticamente.
     *
     * Devuelve siempre `data` para que el caller pueda inspeccionar la
     * respuesta.
     */
    const register = useCallback(async (payload, { signal } = {}) => {
        const data = await api.post("/auth/register", payload, { signal });
        if (data?.requiresVerification) {
            // No persiste sesión todavía: el usuario no existe hasta que
            // verifique el OTP.
            return data;
        }
        // Camino legacy: si el backend alguna vez devuelve token directo.
        if (data?.token && data?.usuario) {
            persistSession(data.token, data.usuario);
        }
        return data;
    }, [persistSession]);

    /**
     * Helper para que el Login/RegisterView, tras un verify-otp exitoso,
     * persista la sesión exactamente igual que login.
     */
    const persistSessionFromVerify = useCallback((tokenValue, userValue) => {
        persistSession(tokenValue, userValue);
    }, [persistSession]);

    const logout = useCallback(() => {
        tokenStore.clear();
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
    }, []);

    const updateUser = useCallback((userValue) => {
        if (!token) return;
        persistSession(token, userValue);
    }, [persistSession, token]);

    const value = useMemo(
        () => ({ token, user, ready, login, register, logout, updateUser, persistSessionFromVerify }),
        [token, user, ready, login, register, logout, updateUser, persistSessionFromVerify],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
    return ctx;
}
