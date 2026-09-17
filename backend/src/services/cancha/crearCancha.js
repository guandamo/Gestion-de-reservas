import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";
import { generarTurnosParaCancha } from "./generadorTurnos.js";

export async function crearCancha({
  nombre,
  horaInicio,
  horaFin,
  precioTurno,
  idTipoCancha,
} = {}) {
  // Validación de parámetros
  if (
    nombre == null ||
    horaInicio == null ||
    horaFin == null ||
    precioTurno == null ||
    idTipoCancha == null
  ) {
    throw new HttpError(400, "Falta algún parámetro obligatorio.");
  }

  if (typeof nombre !== "string" || nombre.trim() === "") {
    throw new HttpError(400, "El nombre de la cancha no es válido, debe ser un texto no vacío.");
  }

  if (!esHoraValida(horaInicio) || !esHoraValida(horaFin)) {
    throw new HttpError(400, "El formato de la hora es inválido. Usar HH:MM.");
  }

  if (horaInicio >= horaFin) {
    throw new HttpError(400, "La hora de inicio debe ser menor a la hora de fin.");
  }

  const minutosInicio = horaInicio.split(":")[1];
  const minutosFin = horaFin.split(":")[1];
  if (minutosInicio !== minutosFin) {
    throw new HttpError(
      400,
      "La hora de inicio y la hora de fin deben tener los mismos minutos.",
    );
  }

  const precio = Number(precioTurno);
  if (!Number.isFinite(precio) || precio <= 0) {
    throw new HttpError(400, "El precio no es válido.");
  }

  const idTipo = Number(idTipoCancha);
  if (!Number.isInteger(idTipo) || idTipo <= 0) {
    throw new HttpError(400, "El tipo de cancha no es válido.");
  }

  const tipoCancha = await prisma.tipoCancha.findUnique({
    where: { id: idTipo },
  });
  if (!tipoCancha) {
    throw new HttpError(404, "El tipo de cancha no existe.");
  }

  // Crear cancha
  const cancha = await prisma.cancha.create({
    data: {
      nombre: nombre.trim(),
      horaInicio: crearHora(horaInicio),
      horaFin: crearHora(horaFin),
      precioTurno: precio,
      idTipoCancha: tipoCancha.id,
    },
  });

  await generarTurnosParaCancha(cancha);
  return cancha;
}

function crearHora(hora) {
  const [horas, minutos] = hora.split(":").map(Number);
  return new Date(Date.UTC(1890, 0, 1, horas, minutos, 0));
}

function esHoraValida(hora) {
  return typeof hora === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
}
