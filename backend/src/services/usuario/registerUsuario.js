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
 * @param {string} input.telefono  obligatorio; `(prefijo)(7 dígitos)`, 8 a 13 dígitos. Se guarda normalizado (solo dígitos, con `+` inicial opcional)
 * @param {string} input.password
 * @param {string} input.confirmPassword
 */
export async function registerUsuario({
  nombre,
  apellido,
  email,
  telefono,
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

  // El teléfono es obligatorio en el alta. No se puede cambiar después desde
  // el perfil (ver `perfilUsuario.js`), así que es el único momento en que el
  // usuario puede cargarlo: si se lo pasa por alto, queda con `null` para
  // siempre.
  const telefonoNormalizado = validarTelefono(telefono);

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

  // `Usuario.telefono` es UNIQUE en el esquema. Sin este chequeo explícito
  // el error que sube desde Postgres sería un P2002 genérico ("Unique constraint
  // failed"), que el frontend no sabe explicar.
  const telefonoTomado = await prisma.usuario.findUnique({
    where: { telefono: telefonoNormalizado },
  });
  if (telefonoTomado) {
    throw new HttpError(
      409,
      "Ese teléfono ya está asociado a otra cuenta.",
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
        telefono: telefonoNormalizado,
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
      telefono: nuevoUsuario.telefono,
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

/**
 * Normaliza el teléfono a solo dígitos (con `+` inicial opcional) para poder
 * guardarlo sin espacios ni guiones.
 *
 * Se aceptan los separadores que la gente escribe a mano (espacios, `-`, `()`)
 * y se guardan eliminados, así "11 (221) 123-4567" y "112214534567" terminan
 * como el mismo valor y no el mismo usuario duplicado en el UNIQUE.
 *
 * El formato exigido es `(prefijo)(7 dígitos)`: entre 1 y 6 dígitos de prefijo
 * más los 7 del número de suscriptor, o sea 8 a 13 dígitos en total. Un número
 * de 7 dígitos pelado se rechaza porque no tiene prefijo.
 */
function validarTelefono(valor) {
  if (valor == null || (typeof valor === "string" && !valor.trim())) {
    throw new HttpError(400, "El teléfono es obligatorio.");
  }
  if (typeof valor !== "string") {
    throw new HttpError(400, "El teléfono no es válido.");
  }

  const telefono = valor.trim().replace(/[\s()-]/g, "");
  if (!/^\+?[0-9]{8,13}$/.test(telefono)) {
    throw new HttpError(
      400,
      "El teléfono debe tener un prefijo de 1 a 6 dígitos más 7 dígitos (8 a 13 en total).",
    );
  }
  return telefono;
}
