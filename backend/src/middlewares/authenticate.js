import jwt from "jsonwebtoken";
import { HttpError } from "../utils/httpError.js";

/**
 * Valida el header Authorization: Bearer <token> y carga
 * `req.user = { id, rol, nombre, apellido, email }`.
 */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new HttpError(401, "Token no proporcionado"));
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) return next(new HttpError(401, "Token vacío"));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.idUsuario,
      rol: payload.rol,
      // Opcionalmente, si el token ya trae datos del usuario firmados
      ...(payload.nombre && { nombre: payload.nombre }),
      ...(payload.apellido && { apellido: payload.apellido }),
      ...(payload.email && { email: payload.email }),
    };
    return next();
  } catch (e) {
    return next(new HttpError(401, "Token inválido o expirado"));
  }
}
