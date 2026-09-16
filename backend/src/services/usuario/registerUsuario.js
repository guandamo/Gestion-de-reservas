import { prisma } from "../../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { HttpError } from "../../utils/httpError.js";
import { createAuditLog } from "../audit/createAuditLog.js";

/**
 * Registro público de un nuevo usuario.
 *  - Siempre crea con rol USUARIO y activo true.
 *  - Hashea la contraseña con bcrypt.
 *  - Registra auditoría nivel 1 + AuditLog.
 *  - Devuelve { token, usuario } con la misma forma que loginUsuario.
 *
 * @param {object} input
 * @param {string} input.nombre
 * @param {string} input.apellido
 * @param {string} input.email
 * @param {string} input.password
 * @param {string} input.confirmPassword
 */
export async function registerUsuario({
  nombre,
  apellido,
  email,
  password,
  confirmPassword,
} = {}) {
  // 1) Validaciones
  const nombreOk = validarNombre(nombre);
  if (!nombreOk.ok) throw new HttpError(400, nombreOk.error);

  const apellidoOk = validarApellido(apellido);
  if (!apellidoOk.ok) throw new HttpError(400, apellidoOk.error);

  if (typeof email !== "string" || !email.trim()) {
    throw new HttpError(400, "El email es obligatorio.");
  }
  const emailNormalizado = email.trim().toLowerCase();
  if (!esEmailValido(emailNormalizado)) {
    throw new HttpError(400, "El email no tiene un formato válido.");
  }

  if (typeof password !== "string" || password.length < 8) {
    throw new HttpError(
      400,
      "La contraseña es obligatoria y debe tener al menos 8 caracteres.",
    );
  }

  if (password !== confirmPassword) {
    throw new HttpError(400, "Las contraseñas no coinciden.");
  }

  // 2) Email único
  const existe = await prisma.usuario.findUnique({
    where: { email: emailNormalizado },
  });
  if (existe) {
    throw new HttpError(
      409,
      "Ya existe una cuenta registrada con ese correo electrónico.",
    );
  }

  // 3) Hash + creación
  const contrasenaHash = await bcrypt.hash(password, 10);

  const nuevoUsuario = await prisma.$transaction(async (tx) => {
    const u = await tx.usuario.create({
      data: {
        nombre: nombreOk.value,
        apellido: apellidoOk.value,
        email: emailNormalizado,
        contrasena: contrasenaHash,
        rol: "USUARIO",
        activo: true,
        ultimoCambio: "ALTA",
      },
    });

    // Auditoría nivel 1: dejar registro de quién hizo la última modificación
    // (en este caso, el propio usuario recién creado).
    await tx.usuario.update({
      where: { id: u.id },
      data: { modificadoPor: u.id },
    });

    // Auditoría nivel 2 (AuditLog)
    await createAuditLog({
      entity: "Usuario",
      entityId: u.id,
      operation: "ALTA",
      performedBy: u.id,
      oldValues: null,
      newValues: { ...u, contrasena: undefined },
      tx,
    });

    return u;
  });

  // 4) Generar JWT (igual que login)
  const token = jwt.sign(
    { idUsuario: nuevoUsuario.id, rol: nuevoUsuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  return {
    token,
    usuario: {
      id: nuevoUsuario.id,
      nombre: nuevoUsuario.nombre,
      apellido: nuevoUsuario.apellido,
      email: nuevoUsuario.email,
      rol: nuevoUsuario.rol,
    },
  };
}

// --- helpers ---

function validarNombre(nombre) {
  if (typeof nombre !== "string" || !nombre.trim()) {
    return { ok: false, error: "El nombre es obligatorio." };
  }
  const limpio = nombre.trim();
  if (limpio.length < 2) {
    return { ok: false, error: "El nombre debe tener al menos 2 caracteres." };
  }
  if (limpio.length > 50) {
    return { ok: false, error: "El nombre debe tener como máximo 50 caracteres." };
  }
  return { ok: true, value: limpio };
}

function validarApellido(apellido) {
  if (typeof apellido !== "string" || !apellido.trim()) {
    return { ok: false, error: "El apellido es obligatorio." };
  }
  const limpio = apellido.trim();
  if (limpio.length < 2) {
    return { ok: false, error: "El apellido debe tener al menos 2 caracteres." };
  }
  if (limpio.length > 50) {
    return { ok: false, error: "El apellido debe tener como máximo 50 caracteres." };
  }
  return { ok: true, value: limpio };
}

function esEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
