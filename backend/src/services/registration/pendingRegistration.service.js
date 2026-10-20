import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";
import { sendEmail } from "../email/index.js";
import { buildVerificationEmail } from "../email/templates/verificationCode.js";
import { confirmarRegistroYCrearUsuario } from "../usuario/confirmarRegistro.js";
import {
  trackOtpForDev,
  clearOtpForDev,
} from "../../config/devFlags.js";
import {
  generarOtp,
  generarPendingToken,
  hashOtp,
  verificarOtp,
} from "./otp.js";

/**
 * Servicio de solicitudes de registro con verificación por OTP.
 *
 * Reglas de seguridad:
 *  - La contraseña del usuario se hashea con bcrypt(10) ANTES de persistirse
 *    en `PendingRegistration`. Nunca se guarda en texto plano.
 *  - El OTP se guarda solo como HMAC-SHA256 (ver `./otp.js`).
 *  - La unicidad activa del email se garantiza con índice único parcial
 *    (`WHERE consumedAt IS NULL`) a nivel BD + chequeo en servicio.
 *  - El `pendingToken` (no el `id`) es lo que el cliente usa para operar.
 */

const MINUTOS_EXPIRACION = 10;
const SEGUNDOS_COOLDOWN = 90;
const MAX_INTENTOS = 5;
const MAX_REENVIOS = 5;

function mascaraEmail(email) {
  if (typeof email !== "string" || !email.includes("@")) return "";
  const [local, dominio] = email.split("@");
  if (local.length <= 1) return `${local}***@${dominio}`;
  return `${local[0]}***@${dominio}`;
}

// --- validadores (mismo comportamiento que registerUsuario.js) ---

function validarNombre(nombre) {
  if (typeof nombre !== "string" || !nombre.trim()) {
    return "El nombre es obligatorio.";
  }
  const t = nombre.trim();
  if (t.length < 2) return "El nombre debe tener al menos 2 caracteres.";
  if (t.length > 50) return "El nombre debe tener como máximo 50 caracteres.";
  return null;
}

function validarApellido(apellido) {
  if (typeof apellido !== "string" || !apellido.trim()) {
    return "El apellido es obligatorio.";
  }
  const t = apellido.trim();
  if (t.length < 2) return "El apellido debe tener al menos 2 caracteres.";
  if (t.length > 50) return "El apellido debe tener como máximo 50 caracteres.";
  return null;
}

function esEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validarPasswordYConfirm(password, confirmPassword) {
  if (typeof password !== "string" || password.length < 8) {
    return "La contraseña es obligatoria y debe tener al menos 8 caracteres.";
  }
  if (password !== confirmPassword) {
    return "Las contraseñas no coinciden.";
  }
  return null;
}

// --- helpers ---

function emitirToken(usuario) {
  return jwt.sign(
    { idUsuario: usuario.id, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );
}

function usuarioPublico(u) {
  return {
    id: u.id,
    nombre: u.nombre,
    apellido: u.apellido,
    email: u.email,
    telefono: u.telefono,
    rol: u.rol,
  };
}

// --- API pública ---

/**
 * Crea una solicitud de registro pendiente:
 *  - Valida inputs.
 *  - Verifica que el email no exista en `Usuario` ni en `PendingRegistration` activa.
 *  - Hashea la contraseña con bcrypt.
 *  - Genera pendingToken + OTP, hashea el OTP.
 *  - Persiste el PendingRegistration.
 *  - Envía el código por Resend.
 *  - Si el envío falla, elimina la fila creada y re-lanza el error (no queda evidencia).
 */
export async function crearSolicitud({
  nombre,
  apellido,
  email,
  password,
  confirmPassword,
} = {}) {
  const errorNombre = validarNombre(nombre);
  if (errorNombre) throw new HttpError(400, errorNombre);
  const errorApellido = validarApellido(apellido);
  if (errorApellido) throw new HttpError(400, errorApellido);

  if (typeof email !== "string" || !email.trim()) {
    throw new HttpError(400, "El email es obligatorio.");
  }
  const emailNormalizado = email.trim().toLowerCase();
  if (!esEmailValido(emailNormalizado)) {
    throw new HttpError(400, "El email no tiene un formato válido.");
  }

  const errorPass = validarPasswordYConfirm(password, confirmPassword);
  if (errorPass) throw new HttpError(400, errorPass);

  // 1) Email no debe existir en Usuario
  const existeUsuario = await prisma.usuario.findUnique({
    where: { email: emailNormalizado },
  });
  if (existeUsuario) {
    throw new HttpError(
      409,
      "Ya existe una cuenta registrada con ese correo electrónico.",
    );
  }

  // 2) No debe haber una solicitud activa para el mismo email.
  //    El índice único parcial "PendingRegistration_email_active_key" lo
  //    garantiza a nivel BD. Aquí leemos para devolver un mensaje claro.
  const activa = await prisma.pendingRegistration.findUnique({
    where: { email: emailNormalizado },
  });
  if (activa && !activa.consumedAt && activa.otpExpiresAt > new Date()) {
    throw new HttpError(
      409,
      "Ya tenés un registro en curso. Revisá tu correo o esperá unos minutos.",
    );
  }

  // 3) Limpieza lazy: si hay solicitudes previas (consumidas o expiradas) las borramos.
  if (activa) {
    await prisma.pendingRegistration.delete({ where: { id: activa.id } });
  }

  // 4) Hashear contraseña y generar tokens.
  const contrasenaHash = await bcrypt.hash(password, 10);
  const pendingToken = generarPendingToken();
  const code = generarOtp();
  const otpHash = hashOtp(code);
  trackOtpForDev(pendingToken, code);
  const expiresAt = new Date(Date.now() + MINUTOS_EXPIRACION * 60_000);
  const now = new Date();

  // 5) Persistir.
  const pending = await prisma.pendingRegistration.create({
    data: {
      pendingToken,
      email: emailNormalizado,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      contrasenaHash,
      otpHash,
      otpExpiresAt: expiresAt,
      lastOtpSentAt: now,
      intentos: 0,
      reenvios: 0,
    },
  });

  // 6) Enviar código. Si falla, deshacemos la persistencia.
  try {
    const { subject, html } = buildVerificationEmail({
      code,
      minutos: MINUTOS_EXPIRACION,
    });
    await sendEmail({ to: pending.email, subject, html });
  } catch (err) {
    await prisma.pendingRegistration.delete({ where: { id: pending.id } });
    throw err;
  }

  return {
    pendingToken: pending.pendingToken,
    email: pending.email,
    expiresAt: pending.otpExpiresAt.toISOString(),
  };
}

/**
 * Verifica un código OTP. Si es correcto, crea el Usuario, marca la solicitud
 * como consumida y emite JWT. Atómico: la creación del Usuario y el marcado
 * de consumedAt viven en la misma transacción.
 */
export async function verificarCodigo({ pendingToken, code } = {}) {
  if (!pendingToken || typeof pendingToken !== "string") {
    throw new HttpError(400, "Falta el token de la solicitud.");
  }
  if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
    throw new HttpError(400, "El código debe tener exactamente 6 dígitos.");
  }

  const pending = await prisma.pendingRegistration.findUnique({
    where: { pendingToken },
  });
  if (!pending) {
    throw new HttpError(404, "La solicitud no existe o ya fue utilizada.");
  }
  if (pending.consumedAt) {
    throw new HttpError(409, "Esta solicitud ya fue utilizada.");
  }
  if (pending.otpExpiresAt <= new Date()) {
    throw new HttpError(400, "El código expiró. Solicitá uno nuevo.");
  }
  if (pending.intentos >= MAX_INTENTOS) {
    throw new HttpError(
      400,
      "Demasiados intentos. Solicitá un código nuevo.",
    );
  }

  const ok = verificarOtp(code, pending.otpHash);
  if (!ok) {
    await prisma.pendingRegistration.update({
      where: { id: pending.id },
      data: { intentos: { increment: 1 } },
    });
    throw new HttpError(400, "El código es incorrecto.", {
      intentosRestantes: Math.max(0, MAX_INTENTOS - pending.intentos - 1),
    });
  }

  // Código correcto: crear Usuario + marcar consumido en una sola tx.
  const nuevoUsuario = await prisma.$transaction(async (tx) => {
    const u = await confirmarRegistroYCrearUsuario(pending, tx);
    await tx.pendingRegistration.update({
      where: { id: pending.id },
      data: { consumedAt: new Date() },
    });
    return u;
  });

  clearOtpForDev(pending.pendingToken);
  const token = emitirToken(nuevoUsuario);
  return { token, usuario: usuarioPublico(nuevoUsuario) };
}

/**
 * Genera y envía un nuevo código para una solicitud pendiente.
 * Respeta el cooldown de 90 s y el máximo de 5 reenvíos.
 */
export async function reenviarCodigo({ pendingToken } = {}) {
  if (!pendingToken || typeof pendingToken !== "string") {
    throw new HttpError(400, "Falta el token de la solicitud.");
  }

  const pending = await prisma.pendingRegistration.findUnique({
    where: { pendingToken },
  });
  if (!pending) {
    throw new HttpError(404, "La solicitud no existe o ya fue utilizada.");
  }
  if (pending.consumedAt) {
    throw new HttpError(409, "Esta solicitud ya fue utilizada.");
  }
  if (pending.otpExpiresAt <= new Date()) {
    throw new HttpError(
      409,
      "La solicitud expiró. Iniciá el registro de nuevo.",
    );
  }

  const ahora = Date.now();
  const cooldownEndsAt =
    pending.lastOtpSentAt.getTime() + SEGUNDOS_COOLDOWN * 1000;
  if (ahora < cooldownEndsAt) {
    throw new HttpError(
      429,
      "Debés esperar antes de solicitar otro código.",
      { cooldownEndsAt: new Date(cooldownEndsAt).toISOString() },
    );
  }

  if (pending.reenvios >= MAX_REENVIOS) {
    throw new HttpError(429, "Alcanzaste el máximo de reenvíos.", {
      reenviosRestantes: 0,
    });
  }

  // Generar nuevos código + hash.
  const nuevoCode = generarOtp();
  const nuevoHash = hashOtp(nuevoCode);
  const nuevoExpiresAt = new Date(Date.now() + MINUTOS_EXPIRACION * 60_000);
  trackOtpForDev(pending.pendingToken, nuevoCode);

  // Persistir primero; si el envío falla, revertir.
  const updated = await prisma.pendingRegistration.update({
    where: { id: pending.id },
    data: {
      otpHash: nuevoHash,
      otpExpiresAt: nuevoExpiresAt,
      lastOtpSentAt: new Date(),
      reenvios: { increment: 1 },
      intentos: 0, // reset: empieza de nuevo el contador
    },
  });

  try {
    const { subject, html } = buildVerificationEmail({
      code: nuevoCode,
      minutos: MINUTOS_EXPIRACION,
    });
    await sendEmail({ to: updated.email, subject, html });
  } catch (err) {
    // Rollback al estado anterior.
    await prisma.pendingRegistration.update({
      where: { id: pending.id },
      data: {
        otpHash: pending.otpHash,
        otpExpiresAt: pending.otpExpiresAt,
        lastOtpSentAt: pending.lastOtpSentAt,
        reenvios: pending.reenvios,
        intentos: pending.intentos,
      },
    });
    throw err;
  }

  return {
    expiresAt: updated.otpExpiresAt.toISOString(),
    cooldownEndsAt: new Date(updated.lastOtpSentAt.getTime() + SEGUNDOS_COOLDOWN * 1000).toISOString(),
    reenviosRestantes: Math.max(0, MAX_REENVIOS - updated.reenvios),
  };
}

/**
 * Devuelve el estado actual de una solicitud. Solo lectura.
 */
export async function obtenerEstado({ pendingToken } = {}) {
  if (!pendingToken || typeof pendingToken !== "string") {
    throw new HttpError(400, "Falta el token de la solicitud.");
  }

  const pending = await prisma.pendingRegistration.findUnique({
    where: { pendingToken },
  });
  if (!pending) {
    throw new HttpError(404, "La solicitud no existe o ya fue utilizada.");
  }

  let estado = "pendiente";
  if (pending.consumedAt) estado = "consumida";
  else if (pending.otpExpiresAt <= new Date()) estado = "expirada";

  const cooldownEndsAt = estado === "pendiente"
    ? new Date(pending.lastOtpSentAt.getTime() + SEGUNDOS_COOLDOWN * 1000).toISOString()
    : null;

  return {
    emailMasked: mascaraEmail(pending.email),
    expiresAt: pending.otpExpiresAt.toISOString(),
    cooldownEndsAt,
    intentosRestantes: Math.max(0, MAX_INTENTOS - pending.intentos),
    reenviosRestantes: Math.max(0, MAX_REENVIOS - pending.reenvios),
    estado,
  };
}