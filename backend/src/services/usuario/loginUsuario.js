import { prisma } from "../../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { HttpError } from "../../utils/httpError.js";

export async function loginUsuario({
  email,
  contrasena,
} = {}) {

  if (email == null || contrasena == null) {
    throw new HttpError(400, "Faltan parámetros");
  }

  if (typeof email !== "string" || typeof contrasena !== "string") {
    throw new HttpError(401, "Credenciales incorrectas");
  }

  const emailNormalizado = email.trim().toLowerCase();
  // Validar formato antes de tocar la BD
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
    throw new HttpError(400, "El email no tiene un formato válido.");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: emailNormalizado },
  });
  if (!usuario) {
    throw new HttpError(401, "Correo o contraseña incorrectos.");
  }

  if (!usuario.activo) {
    throw new HttpError(403, "El usuario está desactivado");
  }

  const contrasenaCorrecta = await bcrypt.compare(contrasena, usuario.contrasena);
  if (!contrasenaCorrecta) {
    throw new HttpError(401, "Correo o contraseña incorrectos.");
  }

  const token = jwt.sign(
    {
      idUsuario: usuario.id,
      rol: usuario.rol,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      telefono: usuario.telefono,
      rol: usuario.rol,
    },
  };
}
