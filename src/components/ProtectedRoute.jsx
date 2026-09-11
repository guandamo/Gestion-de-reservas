import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Protege una ruta verificando:
 *  - autenticación (token presente)
 *  - rol (si se pasó `requireRole`)
 * Si no, redirige a /login (preservando origen) o a /login si falta rol.
 */
export default function ProtectedRoute({ children, requireRole }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireRole && user.rol !== requireRole) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
