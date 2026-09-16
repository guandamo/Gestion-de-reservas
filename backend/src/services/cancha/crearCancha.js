import { prisma } from "../../config/prisma.js";
import { generarTurnosParaCancha } from "./generadorTurnos.js";

export async function crearCancha({ //parametros esperados
  nombre,
  horaInicio,
  horaFin,
  precioTurno,
  idTipoCancha,  
} = {} ) {

//validacion de parametros
  if ( nombre == null || horaInicio == null || horaFin == null || precioTurno == null || idTipoCancha == null
  ) {
    throw new Error("Falta algun parámetro");
  }
  
  if (typeof nombre !== "string" || nombre.trim() === "") {
    throw new Error("El nombre de la cancha no es valido, pase un string");
  }
  
  if (!esHoraValida(horaInicio) || !esHoraValida(horaFin)) {
    throw new Error("El formato de la hora es invalido");
  }

  if (horaInicio >= horaFin) {
    throw new Error("La hora de inicio debe ser menor a la hora de fin");
  }
  
  const minutosInicio = horaInicio.split(":")[1];
  const minutosFin = horaFin.split(":")[1];
  if (minutosInicio !== minutosFin) {
  throw new Error(
    "La hora de inicio y la hora de fin deben tener los mismos minutos"
  );
  }

  const precio = Number(precioTurno);
  if (!Number.isFinite(precio) || precio <= 0) {
    throw new Error("El precio esta mal");
  }

  const idTipo = Number(idTipoCancha);
  if (!Number.isInteger(idTipo) || idTipo <= 0) {
    throw new Error("El tipo de cancha no es válido");
  }

  const tipoCancha = await prisma.tipoCancha.findUnique({
    where: {
        id: idTipo,
    },
    });
  if (!tipoCancha) {
    throw new Error("El tipo de cancha no existe");
  }


//crear cancha

const cancha = await prisma.cancha.create({
    data: {
      nombre: nombre.trim(),
      horaInicio: crearHora(horaInicio),
      horaFin: crearHora(horaFin),
      precioTurno: precio,
      idTipoCancha: tipoCancha.id,
    },
  });

await generarTurnosParaCancha(cancha); //crea los turnos de la cancha
return cancha;
}





function crearHora(hora) {
  const [horas, minutos] = hora.split(":").map(Number);

  return new Date(
    Date.UTC(1890, 0, 1, horas, minutos, 0)
  );
}

function esHoraValida(hora) {
  return typeof hora === "string" &&
         /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
}