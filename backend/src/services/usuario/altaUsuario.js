import { prisma } from "../../config/prisma.js";
import bcrypt from "bcrypt";

/**
 * Alta de usuario desde el panel administrativo (incluye rol y activo).
 * Acepta: {nombre, apellido, email, contrasena, rol, activo}
 */
export async function altaUsuario({
  nombre,
  apellido,
  email,
  contrasena,
  rol,
  activo,
} = {}) {

  // ---- validaciones ----
  if (nombre == null || apellido == null || email == null || contrasena == null) {
    throw new Error("Faltan parametros");
  }

  if (!esNombreValido(nombre)) {
    throw new Error("El nombre tiene formato invalido");
  }
  if (!esNombreValido(apellido)) {
    throw new Error("El apellido tiene formato invalido");
  }

  if (typeof email !== "string") {
    throw new Error("El email es de formato no valido");
  }
  const emailNormalizado = email.trim().toLowerCase();
  if (!esEmailValido(emailNormalizado)) {
    throw new Error("El email es de formato no valido");
  }

  const usuarioConEmail = await prisma.usuario.findUnique({
    where: { email: emailNormalizado },
  });
  if (usuarioConEmail) {
    throw new Error("El mail ya está registrado");
  }

  if (typeof contrasena !== "string") {
    throw new Error("La contraseña no es valida");
  }
  if (!esContrasenaValida(contrasena)) {
    throw new Error(
      "La contraseña no es valida, debe contener al menos 6 caracteres, una mayúscula, una minúscula y un número",
    );
  }

  if (rol != null && !["USUARIO", "ADMIN"].includes(rol)) {
    throw new Error("Rol invalido. Use USUARIO o ADMIN.");
  }

  // ---- alta ----
  const contrasenaHash = await bcrypt.hash(contrasena, 10);

  const usuario = await prisma.usuario.create({
    data: {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: emailNormalizado,
      contrasena: contrasenaHash,
      rol: rol ?? "USUARIO",
      activo: activo ?? true,
      ultimoCambio: "ALTA",
    },
  });

  return usuario;
}

function esNombreValido(valor) {
  return (
    typeof valor === "string" &&
    valor.trim() !== "" &&
    /^[\p{L}\s'-]+$/u.test(valor.trim())
  );
}

function esEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function esContrasenaValida(contrasena) {
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/.test(contrasena)) {
    throw new Error(
      "La contraseña debe tener al menos 6 caracteres, una mayúscula, una minúscula y un número",
    );
  }
}
