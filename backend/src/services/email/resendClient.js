import "dotenv/config";
import { Resend } from "resend";

/**
 * Cliente de Resend (lazy).
 *
 * No se instancia en el import para no romper el arranque del backend
 * cuando todavía no se configuró RESEND_API_KEY (por ejemplo, mientras
 * se desarrollan otras features). El primer envío falla con un mensaje
 * claro si la variable no está definida.
 *
 * Restricciones de Resend a tener en cuenta:
 *  - El dominio `onboarding@resend.dev` SOLO puede enviar al email
 *    asociado a tu cuenta de Resend. Para enviar a otros destinatarios
 *    hay que verificar un dominio propio (https://resend.com/domains)
 *    y usar un `from` con ese dominio.
 *  - RESEND_API_KEY no debe exponerse nunca al frontend ni commitearse.
 */

let cachedClient = null;

export function getResendClient() {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta RESEND_API_KEY en el .env del backend. Obtené una clave en https://resend.com/api-keys",
    );
  }

  cachedClient = new Resend(apiKey);
  return cachedClient;
}

/**
 * Remitente por defecto. Si EMAIL_FROM no está definido, usa
 * `onboarding@resend.dev` (dominio de prueba de Resend).
 */
export function getDefaultFrom() {
  return process.env.EMAIL_FROM || "onboarding@resend.dev";
}