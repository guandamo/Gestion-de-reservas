import { prisma } from "../../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function loginUsuario({
  email,
  contrasena,
} = {}) {
    //validaciones 
    if (email == null || contrasena == null) {
        throw new Error("Faltan parámetros");
    }

    if (typeof email !== "string" || typeof contrasena !== "string") {
        throw new Error("Credenciales incorrectas");
    }

    //fin validaciones

    const emailNormalizado = email.trim().toLowerCase();
    const usuario = await prisma.usuario.findUnique({
        where: {
            email: emailNormalizado,
        },
    });
    if (!usuario) {
        throw new Error("datos no validos");
    }

    if (!usuario.activo) {
        throw new Error("El usuario está desactivado");
    }


    const contrasenaCorrecta = await bcrypt.compare(
        contrasena,
        usuario.contrasena
     );
    if (!contrasenaCorrecta) {
        throw new Error("datos no validos");
    }


    //crear token JWT
    const token = jwt.sign(
    {
      idUsuario: usuario.id,
      rol: usuario.rol,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      telefono: usuario.telefono,
      rol: usuario.rol,
    },
  };

}