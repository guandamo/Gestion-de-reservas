import { loginUsuario } from "../services/usuario/loginUsuario.js";
import { registerUsuario } from "../services/usuario/registerUsuario.js";

/**
 * POST /api/auth/login
 * Body: { email, contrasena }
 */
export async function login(req, res) {
  const { email, contrasena } = req.body ?? {};

  if (!email || !contrasena) {
    return res.status(400).json({ error: "Faltan credenciales" });
  }

  const resultado = await loginUsuario({ email, contrasena });
  return res.json(resultado);
}

/**
 * POST /api/auth/register
 * Body: { nombre, apellido, email, password, confirmPassword }
 */
export async function register(req, res) {
  const { nombre, apellido, email, password, confirmPassword } = req.body ?? {};

  if (!nombre || !apellido || !email || !password || !confirmPassword) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }

  const resultado = await registerUsuario({
    nombre,
    apellido,
    email,
    password,
    confirmPassword,
  });

  // Status 201 (recurso creado). Mismo shape que /login.
  return res.status(201).json(resultado);
}
