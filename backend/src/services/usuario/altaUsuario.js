import { prisma } from "../../config/prisma.js";
import bcrypt from "bcrypt";

export async function altaUsuario({
  nombre,
  apellido,
  email,
  contrasena,
  telefono,
} = {}) {

//inicio validaciones

    if (nombre == null || apellido == null || email == null || contrasena == null || telefono == null) {
    throw new Error("Faltan parametros");
    }


    if (!esNombreValido(nombre)) {
    throw new Error("El nombre tiene formato invalido");
    }

    if (!esNombreValido(apellido)) {
    throw new Error("El apellido tiene formato invalido");
    }


    if (typeof email !== "string") {
        throw new Error("El email es de formato no valido");
    }
    const emailNormalizado = email.trim().toLowerCase();
    if (!esEmailValido(emailNormalizado)) {
        throw new Error("El email es de formato no valido");
    }


    const usuarioConEmail = await prisma.usuario.findUnique({
        where: {
            email: emailNormalizado,
        },
    });
    if (usuarioConEmail) {
        throw new Error("El mail ya está registrado");
    }

    if (typeof telefono !== "string") {
        throw new Error("El telefono es incorrecto");
    }
    const telefonoNormalizado = normalizarTelefono(telefono);
    if (!esTelefonoValido(telefonoNormalizado)) {
        throw new Error("El teléfono es invalido");
    }
    const usuarioConTelefono = await prisma.usuario.findUnique({
        where: {
            telefono: telefonoNormalizado,
        },
    });
    if (usuarioConTelefono) {
        throw new Error("El telefono ya está registrado");
    }

    if (typeof contrasena !== "string") {
        throw new Error("La contraseña no es valida");
    }


// fin validaciones

    const contrasenaHash = await bcrypt.hash(contrasena, 10);


    const usuario = await prisma.usuario.create({
        data: {
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            email: emailNormalizado,
            contrasena: contrasenaHash,
            telefono: telefonoNormalizado,
            ultimoCambio: "ALTA",
        },
    });

    return usuario;

}


function esNombreValido(valor) {
  return (
    typeof valor === "string" &&
    valor.trim() !== "" &&
    /^[\p{L}\s'-]+$/u.test(valor.trim())
  );
}

function esEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizarTelefono(telefono) {
  return telefono.replace(/[\s()-]/g, "");
}

function esTelefonoValido(telefono) {
  return /^\+?[0-9]{7,15}$/.test(telefono);
}