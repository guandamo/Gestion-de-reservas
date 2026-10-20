import {
  crearSolicitud,
  verificarCodigo as verificarCodigoService,
  reenviarCodigo as reenviarCodigoService,
  obtenerEstado as obtenerEstadoService,
} from "../services/registration/pendingRegistration.service.js";

/**
 * POST /api/auth/register
 * Body: { nombre, apellido, email, password, confirmPassword }
 * → 201 { requiresVerification: true, pendingToken, email, expiresAt }
 * → 400 / 409 / 502 (vienen del servicio vía HttpError)
 */
export async function iniciarRegistro(req, res) {
  const { nombre, apellido, email, password, confirmPassword } = req.body ?? {};
  if (!nombre || !apellido || !email || !password || !confirmPassword) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }
  const resultado = await crearSolicitud({
    nombre,
    apellido,
    email,
    password,
    confirmPassword,
  });
  return res.status(201).json({
    requiresVerification: true,
    pendingToken: resultado.pendingToken,
    email: resultado.email,
    expiresAt: resultado.expiresAt,
  });
}

/**
 * POST /api/auth/verify-otp
 * Body: { pendingToken, code }
 * → 200 { token, usuario }
 */
export async function verificarCodigo(req, res) {
  const { pendingToken, code } = req.body ?? {};
  if (!pendingToken || !code) {
    return res.status(400).json({ error: "Faltan datos de verificación." });
  }
  const resultado = await verificarCodigoService({ pendingToken, code });
  return res.json(resultado);
}

/**
 * POST /api/auth/resend-otp
 * Body: { pendingToken }
 * → 200 { expiresAt, cooldownEndsAt, reenviosRestantes }
 */
export async function reenviarCodigo(req, res) {
  const { pendingToken } = req.body ?? {};
  if (!pendingToken) {
    return res.status(400).json({ error: "Falta el token de la solicitud." });
  }
  const resultado = await reenviarCodigoService({ pendingToken });
  return res.json(resultado);
}

/**
 * GET /api/auth/registration/:token/status
 * → 200 { emailMasked, expiresAt, cooldownEndsAt, intentosRestantes, reenviosRestantes, estado }
 */
export async function obtenerEstado(req, res) {
  const { token } = req.params;
  const resultado = await obtenerEstadoService({ pendingToken: token });
  return res.json(resultado);
}