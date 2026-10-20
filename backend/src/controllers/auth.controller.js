import { loginUsuario } from "../services/usuario/loginUsuario.js";
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