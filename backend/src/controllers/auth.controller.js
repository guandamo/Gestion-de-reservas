import { loginUsuario } from "../services/usuario/loginUsuario.js";
import { registerUsuario } from "../services/usuario/registerUsuario.js";
import { emailExiste } from "../services/usuario/emailExiste.js";
import {
  actualizarPerfil,
  cambiarContrasena,
  obtenerPerfil,
} from "../services/usuario/perfilUsuario.js";

/**
 * POST /api/auth/login
 * Body: { email, contrasena }
 */
export async function login(req, res) {
  const { email, contrasena } = req.body ?? {};

  if (!email || !contrasena) {
    return res.status(400).json({ error: "Faltan credenciales" });
  }

  try {
    const resultado = await loginUsuario({ email, contrasena });
    return res.json(resultado);
  } catch (e) {
    if (e.message === "datos no validos") {
      return res.status(401).json({ error: "Correo o contraseña incorrectos" });
    }
    if (e.message === "El usuario está desactivado") {
      return res.status(403).json({ error: e.message });
    }
    throw e;
  }
}

/**
 * POST /api/auth/register
 * Body: { nombre, apellido, email, telefono, password, confirmPassword }
 */
export async function register(req, res) {
  const { nombre, apellido, email, telefono, password, confirmPassword } =
    req.body ?? {};

  if (!nombre || !apellido || !email || !telefono || !password || !confirmPassword) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }

  const resultado = await registerUsuario({
    nombre,
    apellido,
    email,
    telefono,
    password,
    confirmPassword,
  });

  // Status 201 (recurso creado). Mismo shape que /login.
  return res.status(201).json(resultado);
}

/**
 * GET /api/auth/existe-email?email=...
 *
 * Read-only. Pensado para que el frontend decida si abrir el modal de
 * simulación de verificación de email sin escribir en la BD.
 *
 * Respuestas:
 *  - 200 { existe: boolean }
 *  - 400 si el email falta o no tiene formato válido.
 */
export async function existeEmail(req, res) {
  const email = req.query?.email;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "El email no tiene un formato válido." });
  }
  const existe = await emailExiste(email);
  return res.json({ existe });
}

export async function me(req, res) {
  const usuario = await obtenerPerfil(req.user.id);
  return res.json({ usuario });
}

export async function updateMe(req, res) {
  const usuario = await actualizarPerfil(req.user.id, req.body ?? {});
  return res.json({ usuario });
}

export async function updateMyPassword(req, res) {
  await cambiarContrasena(req.user.id, req.body ?? {});
  return res.json({ mensaje: "Contraseña actualizada correctamente." });
}
