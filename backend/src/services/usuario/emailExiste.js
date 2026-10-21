import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";

/**
 * Servicio read-only: ¿existe un usuario con este email?
 *
 * Pensado para que el frontend (registro / recuperación de contraseña) pueda
 * decidir si abrir el modal de simulación sin escribir en la base.
 *  - Normaliza `email` con `trim()` + `toLowerCase()` (coherente con
 *    `loginUsuario.js` y `registerUsuario.js`, que ya almacenan así).
 *  - Solo devuelve `true`/`false`: nunca datos del usuario (evita exponer
 *    PII a un endpoint público).
 *  - Valida el formato antes de tocar la BD.
 */
export async function emailExiste(emailIngresado) {
  if (typeof emailIngresado !== "string") {
    throw new HttpError(400, "El email no tiene un formato válido.");
  }

  const email = emailIngresado.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "El email no tiene un formato válido.");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true },
  });

  return Boolean(usuario);
}
