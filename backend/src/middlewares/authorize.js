import { HttpError } from "../utils/httpError.js";

/**
 * Restringe acceso a ciertos roles.
 * Uso: router.get("/", authenticate, authorize("ADMIN"), handler)
 */
export function authorize(...rolesPermitidos) {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, "No autenticado"));
    if (!rolesPermitidos.includes(req.user.rol)) {
      return next(
        new HttpError(
          403,
          `Acceso denegado. Requiere rol: ${rolesPermitidos.join(", ")}`,
        ),
      );
    }
    return next();
  };
}
