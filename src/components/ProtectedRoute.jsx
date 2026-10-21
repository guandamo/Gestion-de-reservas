import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { INICIO_POR_ROL } from "../lib/rutas.js";

/**
 * Protege una ruta verificando:
 *  - autenticación (token presente)
 *  - rol (si se pasó `requireRole`)
 *
 * Si el usuario está autenticado pero no tiene el rol requerido NO se lo manda
 * a `/login`: ya tiene sesión, y mandarlo al login lo deja en un limbo donde
 * el formulario vuelve a pedir credenciales de algo que ya tiene. Se lo manda
 * a su propio inicio.
 *
 * Ese desvío sin `state` era además lo que hacía que el SEGUNDO intento de
 * login "funcionara": el `from` original se perdía en el rebote, y el segundo
 * intento caía al inicio por rol. Ver `destinoTrasLogin` en `Login.jsx`.
 */
export default function ProtectedRoute({ children, requireRole }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireRole && user.rol !== requireRole) {
    const inicio = INICIO_POR_ROL[user.rol] ?? "/";
    return <Navigate to={inicio} replace />;
  }

  return children;
}