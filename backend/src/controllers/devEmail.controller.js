import { sendEmail } from "../services/email/index.js";
import {
  setForceEmailFailure,
  isEmailFailureForced,
  peekOtpForDev,
  clearOtpForDev,
} from "../config/devFlags.js";

/**
 * POST /api/dev/email-test
 *
 * Endpoint SOLO para desarrollo. Se monta únicamente cuando
 * NODE_ENV !== 'production' (ver server.js).
 *
 * Body:
 *   {
 *     to: string,
 *     subject?: string,
 *     html?: string,
 *     text?: string,
 *   }
 *
 * Restricciones:
 *  - El `from` por defecto es `onboarding@resend.dev` (o EMAIL_FROM si
 *    está definido). Ese dominio de prueba SOLO puede enviar al email
 *    asociado a tu cuenta de Resend. Para enviar a otros destinatarios
 *    hay que verificar un dominio y cambiar EMAIL_FROM.
 *  - Devuelve 502 si Resend rechaza el envío (incluyendo el caso 403
 *    del dominio de prueba), con el mensaje original de la SDK.
 */
export async function sendTestEmail(req, res) {
  const {
    to,
    subject = "Prueba de Resend · Gestión de canchas",
    html = "<p>Hola 👋 — Este es un correo de prueba enviado desde el backend con Resend.</p>",
    text,
    from,
  } = req.body ?? {};

  if (!to) {
    return res.status(400).json({ error: "Falta el campo 'to'." });
  }

  const { id } = await sendEmail({ to, subject, html, text, from });
  return res.json({ ok: true, id });
}

/**
 * POST /api/dev/force-email-failure
 * Body: { enabled?: boolean }   (default true)
 *
 * Si `enabled` es true, los próximos envíos a través de `sendEmail` lanzan
 * un error simulado. Usado por los smoke tests para validar el camino de
 * fallo sin tocar Resend. Solo activo fuera de producción.
 */
export async function setForceEmailFailureHandler(req, res) {
  const enabled = req.body?.enabled !== false;
  setForceEmailFailure(enabled);
  return res.json({ ok: true, forceEmailFailure: isEmailFailureForced() });
}

/**
 * GET /api/dev/peek-otp?pendingToken=...
 * Devuelve el código OTP en texto plano generado para esa solicitud, SOLO
 * si el backend está fuera de producción y existe en memoria. Pensado para
 * los smoke tests: les permite conocer el código sin tener que parsear el
 * correo real.
 */
export async function peekOtpHandler(req, res) {
  const { pendingToken } = req.query ?? {};
  if (!pendingToken) {
    return res.status(400).json({ error: "Falta 'pendingToken'." });
  }
  const code = peekOtpForDev(String(pendingToken));
  if (!code) {
    return res
      .status(404)
      .json({ error: "No hay OTP en memoria para ese pendingToken." });
  }
  return res.json({ ok: true, pendingToken, code });
}

/**
 * DELETE /api/dev/peek-otp?pendingToken=...
 * Limpia el código OTP cacheado (sólo tests, no afecta la lógica de
 * negocio).
 */
export async function clearOtpHandler(req, res) {
  const { pendingToken } = req.query ?? {};
  if (!pendingToken) {
    return res.status(400).json({ error: "Falta 'pendingToken'." });
  }
  clearOtpForDev(String(pendingToken));
  return res.json({ ok: true });
}