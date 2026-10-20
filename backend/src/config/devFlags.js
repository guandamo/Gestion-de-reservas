/**
 * Flags de desarrollo en memoria.
 *
 * Permite simular fallos del proveedor de correo en tests sin tocar Resend,
 * y exponer el código OTP actual para que los smoke tests puedan verificar
 * el flujo de éxito sin tener que parsear correos. Solo los endpoints que
 * consultan estos flags se montan en `NODE_ENV !== "production"` (ver
 * `devEmail.routes.js`).
 *
 * NO usar en producción: las funciones siguen existiendo pero ningún código
 * de producción debería llamarlas directamente (los chequea `sendEmail`
 * solo si NODE_ENV no es production).
 */

let forceEmailFailure = false;

// Mapa pendienteToken -> código OTP en texto plano.
// Solo se escribe desde `pendingRegistration.service.js` cuando se genera un
// código nuevo. Lo consulta un endpoint dev exclusivo para los smoke tests.
const pendingOtpCodes = new Map();

export function setForceEmailFailure(value) {
  forceEmailFailure = Boolean(value);
}

export function isEmailFailureForced() {
  return forceEmailFailure;
}

export function trackOtpForDev(pendingToken, code) {
  if (!pendingToken || !code) return;
  pendingOtpCodes.set(pendingToken, code);
}

export function peekOtpForDev(pendingToken) {
  return pendingOtpCodes.get(pendingToken) ?? null;
}

export function clearOtpForDev(pendingToken) {
  pendingOtpCodes.delete(pendingToken);
}