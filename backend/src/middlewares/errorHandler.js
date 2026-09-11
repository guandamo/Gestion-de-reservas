import { HttpError } from "../utils/httpError.js";

export const notFoundHandler = (req, _res, next) => {
  next(new HttpError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};

/* eslint-disable no-unused-vars */
export const errorHandler = (err, req, res, _next) => {
  // HttpError lanzado intencionalmente
  if (err instanceof HttpError) {
    return res
      .status(err.status)
      .json({ error: err.message, details: err.details ?? undefined });
  }

  // Error de validación de Prisma (e.g. unique constraint)
  if (err?.code === "P2002") {
    return res.status(409).json({
      error: "Conflicto de unicidad",
      details: { target: err?.meta?.target },
    });
  }
  if (err?.code === "P2025") {
    return res.status(404).json({ error: "Recurso no encontrado" });
  }

  console.error("Error no controlado:", err);
  return res.status(500).json({ error: "Error interno del servidor" });
};
