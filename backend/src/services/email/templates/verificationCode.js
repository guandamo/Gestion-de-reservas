/**
 * Template del correo de verificación por OTP.
 * Devuelve { subject, html } listo para pasar a `sendEmail`.
 *
 * No usamos React Email ni dependencias nuevas: HTML inline con estilos
 * básicos. El cliente de correo (Gmail, Outlook, etc.) acepta inline.
 */
export function buildVerificationEmail({ code, minutos = 10 } = {}) {
  const subject = "Verificá tu correo · Gestión de canchas";
  const html = `
<div style="font-family: 'Roboto', Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #222222; color: #FFFFFF; padding: 28px; border-radius: 12px;">
  <h2 style="color: #E8F5EE; margin: 0 0 16px; font-size: 20px;">Verificá tu correo electrónico</h2>
  <p style="color: #d4d4d4; font-size: 14px; line-height: 1.5; margin: 0 0 16px;">
    Usá este código para completar tu registro en <strong style="color:#FFFFFF">Gestión de canchas</strong>:
  </p>
  <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 18px 8px; background: #171717; border: 1px solid #3a3a3a; border-radius: 8px; color: #FFFFFF;">
    ${code}
  </div>
  <p style="color: #a0a0a0; font-size: 13px; line-height: 1.5; margin: 20px 0 0;">
    Este código vence en <strong>${minutos} minutos</strong>.
    Si no solicitaste este correo, podés ignorarlo.
  </p>
  <hr style="border: 0; border-top: 1px solid #3a3a3a; margin: 20px 0;" />
  <p style="color: #808080; font-size: 11px; margin: 0;">
    Gestión de canchas · No responder a este correo.
  </p>
</div>
`.trim();
  return { subject, html };
}