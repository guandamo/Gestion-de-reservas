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

  const login = useCallback(async (email, contrasena) => {
    const data = await api.post("/auth/login", { email, contrasena });
    persistSession(data.token, data.usuario);
    return data.usuario;
  }, [persistSession]);

  /**
   * Registro público: crea el usuario y deja la sesión iniciada.
   * Espera {nombre, apellido, email, password, confirmPassword}.
   */
  const register = useCallback(async (payload) => {
    const data = await api.post("/auth/register", payload);
    persistSession(data.token, data.usuario);
    return data.usuario;
  }, [persistSession]);

  const logout = useCallback(() => {
    tokenStore.clear();
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, ready, login, register, logout }),
    [token, user, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
