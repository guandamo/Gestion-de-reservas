import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
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
    // Al montar, si hay token pero no user, podríamos hidratar más adelante
    setReady(true);
  }, []);

  const login = useCallback(async (email, contrasena) => {
    const data = await api.post("/auth/login", { email, contrasena });
    tokenStore.set(data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
    setToken(data.token);
    setUser(data.usuario);
    return data.usuario;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, ready, login, logout }),
    [token, user, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
