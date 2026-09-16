import { prisma } from "../../config/prisma.js";

export async function crearTipoCancha({
  descripcion,
} = {}) {

  // Comprueba si hay parametro
  if (descripcion == null || typeof descripcion !== "string" ||
    descripcion.trim() === "") {
    throw new Error("Error, descripcion no valida");
  }

  // Comprueba que la descripcion no existe
  const tipoExistente = await prisma.tipoCancha.findUnique({
    where: {
      descripcion: descripcion.trim(),
    },
  });
  if (tipoExistente) {
    throw new Error("El tipo de cancha ya existe");
  }

  // Crea el tipo de cancha
  const tipoCancha = await prisma.tipoCancha.create({
    data: {
      descripcion: descripcion.trim(),
    },
  });

  return tipoCancha;
}