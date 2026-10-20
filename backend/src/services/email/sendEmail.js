import { HttpError } from "../../utils/httpError.js";
import { isEmailFailureForced } from "../../config/devFlags.js";
import { getResendClient, getDefaultFrom } from "./resendClient.js";

/**
 * Envía un correo usando Resend.
 *
 * @param {object} params
 * @param {string|string[]} params.to       - Destinatario(s). Máximo 50.
 * @param {string} [params.subject]         - Asunto. Por defecto: "Notificación de Gestión de canchas".
 * @param {string} [params.html]            - Cuerpo HTML.
 * @param {string} [params.text]            - Cuerpo en texto plano (opcional, Resend lo genera a partir de html si se omite).
 * @param {string} [params.from]            - Remitente. Si se omite, usa EMAIL_FROM o `onboarding@resend.dev`.
 *
 * @returns {Promise<{id: string}>}   Devuelve el id del email en Resend.
 *
 * @throws {HttpError} 400 si faltan campos requeridos, 502 si Resend falla.
 *
 * Ejemplo de uso futuro (registro con código de 6 dígitos):
 *   await sendEmail({
 *     to: usuario.email,
 *     subject: "Verificá tu cuenta",
 *     html: `<p>Tu código es <strong>${codigo}</strong>. Expira en 10 minutos.</p>`,
 *   });
 */
export async function sendEmail({
  to,
  subject = "Notificación de Gestión de canchas",
  html,
  text,
  from,
} = {}) {
  // --- Validaciones ---
  if (!to || (Array.isArray(to) && to.length === 0)) {
    throw new HttpError(400, "Falta el destinatario (to).");
  }
  if (!html && !text) {
    throw new HttpError(400, "Debe incluirse al menos un cuerpo (html o text).");
  }

  const payload = {
    from: from || getDefaultFrom(),
    to: Array.isArray(to) ? to : [to],
    subject,
  };
  if (html) payload.html = html;
  if (text) payload.text = text;

  // --- Envío ---
  let data;
  let error;
  try {
    if (process.env.NODE_ENV !== "production" && isEmailFailureForced()) {
      throw new Error("Fallo simulado por /api/dev/force-email-failure");
    }
    const resend = getResendClient();
    ({ data, error } = await resend.emails.send(payload));
  } catch (err) {
    // Falla local (sin API key, sin red, etc.)
    const message =
      err?.message ||
      "No se pudo enviar el correo (error local). Revisá RESEND_API_KEY.";
    throw new HttpError(502, message);
  }

  if (error) {
    // La SDK de Resend nunca lanza: devuelve { data: null, error: {...} }.
    // El caso más común en desarrollo es el 403 del dominio `onboarding@resend.dev`
    // cuando se intenta enviar a un destinatario distinto al email de la cuenta.
    throw new HttpError(
      502,
      `Resend rechazó el envío: ${error.message || "error desconocido"}`,
    );
  }

  if (!data?.id) {
    throw new HttpError(502, "Resend no devolvió id de mensaje.");
  }

  return { id: data.id };
}