import crypto from "node:crypto";

/**
 * OTP — primitives para generación, hash y verificación de códigos de 6 dígitos.
 *
 * Decisiones de seguridad:
 *  - 6 dígitos (espacio de búsqueda 10^6) compensado por: intentos limitados
 *    en la capa de servicio (5), expiración corta (10 min) y comparación
 *    con `crypto.timingSafeEqual` (no vulnerable a timing attacks).
 *  - Hash con HMAC-SHA256 + `OTP_HASH_SECRET` (server-side pepper). Así, una
 *    eventual filtración de la BD no expone los códigos sin el secreto.
 *  - `crypto.randomInt(0, 1_000_000)` es un generador criptográficamente
 *    seguro. El padStart(6, "0") garantiza que códigos como "0042" sigan
 *    siendo exactamente 6 caracteres.
 *
 * El secreto debe estar definido como env var `OTP_HASH_SECRET`. Si falta,
 * `hashOtp`/`verificarOtp` lanzan un error explícito para no degradar la
 * seguridad silenciosamente.
 */

const SECRET = process.env.OTP_HASH_SECRET;

function ensureSecret() {
  if (!SECRET || SECRET.length < 16) {
    throw new Error(
      "Falta OTP_HASH_SECRET en el .env del backend (≥16 chars). " +
        "Generá uno con: node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\"",
    );
  }
}

/**
 * Genera un código OTP de 6 dígitos como string (puede empezar con 0).
 */
export function generarOtp() {
  const n = crypto.randomInt(0, 1_000_000); // [0, 999_999]
  return String(n).padStart(6, "0");
}

/**
 * Genera un token opaco para identificar una solicitud pendiente.
 * Es lo que el cliente usa para verificar, reenviar y consultar el estado.
 * NO es el `id` entero de la fila.
 */
export function generarPendingToken() {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Hashea un código OTP con HMAC-SHA256 + secreto del servidor.
 * Devuelve el hash en hex.
 */
export function hashOtp(code) {
  ensureSecret();
  return crypto.createHmac("sha256", SECRET).update(String(code)).digest("hex");
}

/**
 * Verifica un código contra un hash guardado, en tiempo constante.
 * Devuelve `true` solo si coinciden.
 *
 * Acepta hashes que no sean hex de 64 chars: devuelve `false` sin lanzar
 * (defensa contra basura en la BD).
 */
export function verificarOtp(code, hashGuardado) {
  if (typeof hashGuardado !== "string" || hashGuardado.length !== 64) {
    return false;
  }
  let esperado;
  try {
    esperado = Buffer.from(hashGuardado, "hex");
  } catch {
    return false;
  }
  if (esperado.length !== 32) return false;

  const calculado = crypto
    .createHmac("sha256", SECRET)
    .update(String(code))
    .digest();

  return crypto.timingSafeEqual(calculado, esperado);
}