/**
 * Servicio de email (Resend).
 *
 * API pública:
 *   - sendEmail({ to, subject, html, text, from })  → { id }
 *
 * La integración con el registro se hace más adelante (verificación con
 * código de 6 dígitos y expiración de 10 min).
 */
export { sendEmail } from "./sendEmail.js";
export { getResendClient, getDefaultFrom } from "./resendClient.js";