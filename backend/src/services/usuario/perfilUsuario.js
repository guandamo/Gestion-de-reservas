import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";
import { createAuditLog } from "../audit/createAuditLog.js";

const usuarioPublicoSelect = {
  id: true,
  nombre: true,
  apellido: true,
  email: true,
  telefono: true,
  rol: true,
  activo: true,
};

export async function obtenerPerfil(idUsuario) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: idUsuario },
    select: usuarioPublicoSelect,
  });

  if (!usuario) throw new HttpError(404, "Usuario no encontrado.");
  return usuario;
}

export async function actualizarPerfil(idUsuario, input = {}) {
  const usuarioActual = await prisma.usuario.findUnique({
    where: { id: idUsuario },
  });
  if (!usuarioActual) throw new HttpError(404, "Usuario no encontrado.");

  if (Object.hasOwn(input, "email") && input.email !== usuarioActual.email) {
    throw new HttpError(400, "El correo electrónico no se puede modificar desde el perfil.");
  }

  const data = {};

  if (Object.hasOwn(input, "nombre")) {
    data.nombre = validarNombre(input.nombre, "El nombre");
  }
  if (Object.hasOwn(input, "apellido")) {
    data.apellido = validarNombre(input.apellido, "El apellido");
  }
  if (Object.hasOwn(input, "telefono")) {
    data.telefono = validarTelefono(input.telefono);
  }

  if (Object.keys(data).length === 0) {
    throw new HttpError(400, "Ingresá al menos un dato para actualizar.");
  }

  if (data.telefono && data.telefono !== usuarioActual.telefono) {
    const existente = await prisma.usuario.findUnique({ where: { telefono: data.telefono } });
    if (existente) throw new HttpError(409, "Ese teléfono ya está asociado a otra cuenta.");
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.update({
      where: { id: idUsuario },
      data: {
        ...data,
        modificadoPor: idUsuario,
        ultimoCambio: "MODIFICACION_PERFIL",
      },
      select: usuarioPublicoSelect,
    });

    await createAuditLog({
      entity: "Usuario",
      entityId: idUsuario,
      operation: "MODIFICACION_PERFIL",
      performedBy: idUsuario,
      oldValues: usuarioActual,
      newValues: usuario,
      tx,
    });

    return usuario;
  });

  return actualizado;
}

export async function cambiarContrasena(idUsuario, input = {}) {
  const { contrasenaActual, contrasenaNueva, confirmarContrasena } = input;

  if (typeof contrasenaActual !== "string" || !contrasenaActual) {
    throw new HttpError(400, "La contraseña actual es obligatoria.");
  }
  if (typeof contrasenaNueva !== "string" || contrasenaNueva.length < 8) {
    throw new HttpError(400, "La nueva contraseña debe tener al menos 8 caracteres.");
  }
  if (contrasenaNueva !== confirmarContrasena) {
    throw new HttpError(400, "Las contraseñas nuevas no coinciden.");
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: idUsuario } });
  if (!usuario) throw new HttpError(404, "Usuario no encontrado.");

  const coincide = await bcrypt.compare(contrasenaActual, usuario.contrasena);
  if (!coincide) throw new HttpError(400, "La contraseña actual no es correcta.");

  const mismaContrasena = await bcrypt.compare(contrasenaNueva, usuario.contrasena);
  if (mismaContrasena) {
    throw new HttpError(400, "La nueva contraseña debe ser diferente de la actual.");
  }

  const contrasenaHash = await bcrypt.hash(contrasenaNueva, 10);

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: { id: idUsuario },
      data: {
        contrasena: contrasenaHash,
        modificadoPor: idUsuario,
        ultimoCambio: "CAMBIO_CONTRASENA",
      },
    });

    await createAuditLog({
      entity: "Usuario",
      entityId: idUsuario,
      operation: "CAMBIO_CONTRASENA",
      performedBy: idUsuario,
      oldValues: null,
      newValues: { id: idUsuario, ultimoCambio: "CAMBIO_CONTRASENA" },
      tx,
    });
  });
}

function validarNombre(valor, etiqueta) {
  if (typeof valor !== "string" || !valor.trim()) {
    throw new HttpError(400, `${etiqueta} es obligatorio.`);
  }
  const limpio = valor.trim();
  if (limpio.length < 2 || limpio.length > 50) {
    throw new HttpError(400, `${etiqueta} debe tener entre 2 y 50 caracteres.`);
  }
  return limpio;
}

function validarTelefono(valor) {
  if (valor == null || valor === "") return null;
  if (typeof valor !== "string") throw new HttpError(400, "El teléfono no es válido.");

  const telefono = valor.replace(/[\s()-]/g, "");
  if (!/^\+?[0-9]{7,15}$/.test(telefono)) {
    throw new HttpError(400, "El teléfono debe tener entre 7 y 15 dígitos.");
  }
  return telefono;
}
