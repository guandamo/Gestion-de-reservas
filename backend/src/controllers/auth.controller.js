import { loginUsuario } from "../services/usuario/loginUsuario.js";

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
