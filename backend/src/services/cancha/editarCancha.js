import { prisma } from "../../config/prisma.js";
import { generarTurnosParaCancha } from "./generadorTurnos.js";

export async function editarCancha(idCancha, {
  nombre,
  horaInicio,
  horaFin,
  precioTurno,
  idTipoCancha,
  activa,
} = {}) {

    const id = Number(idCancha);
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("El ID de la cancha no es válido");
    }

    const canchaActual = await prisma.cancha.findUnique({
    where: {
      id: id,
    },
    });

    if (!canchaActual) {
        throw new Error("La cancha no existe");
    }



    if ( nombre === undefined && horaInicio === undefined && horaFin === undefined && precioTurno === undefined && idTipoCancha === undefined && activa === undefined) {
        throw new Error("No se pasaron campoos para modificar");
    }

    const datos = {};  //aca se guardan los daros a modificar

    if (nombre !== undefined) {
        if (typeof nombre !== "string" || nombre.trim() === "") {
            throw new Error("El nombre no cumple con el formato");
        }
        datos.nombre = nombre.trim();
    }




    if (idTipoCancha !== undefined) {

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

        datos.idTipoCancha = idTipo;
    }


    let precioNuevo;
    if (precioTurno !== undefined) {

        precioNuevo = Number(precioTurno);

        if (!Number.isFinite(precioNuevo) || precioNuevo <= 0) {
            throw new Error("El precio no es válido");
        }
        datos.precioTurno = precioNuevo;
    }

    if (activa !== undefined) {

        if (typeof activa !== "boolean") {
            throw new Error("El estado de la cancha no es válido");
        }
        datos.activa = activa;
    }

// ¿que pasa con los turnos reservados si se cambia el horario de la cancha? los turnos quedan reservados quedan, y los restantes se crean nuevamente en
// horario valido. PROBLEMA: pueden quedar huecos de tiempo sin turnos si cambian los minutos
    

    const cambiaHorario = horaInicio !== undefined || horaFin !== undefined;

    if (cambiaHorario) {

    // Si solo se modifica una de las dos horas, se usa el valor actual de la otra
    const nuevaHoraInicio =
      horaInicio === undefined
        ? convertirHoraAString(canchaActual.horaInicio)
        : horaInicio;
    const nuevaHoraFin =
      horaFin === undefined
        ? convertirHoraAString(canchaActual.horaFin)
        : horaFin;

    if (
      !esHoraValida(nuevaHoraInicio) || !esHoraValida(nuevaHoraFin)
    ) {
      throw new Error("El formato del horario no es válido");
    }

    if (nuevaHoraInicio >= nuevaHoraFin) {
      throw new Error("La hora de inicio debe ser menor a la hora de fin");
    }

    const minutosInicio = nuevaHoraInicio.split(":")[1];
    const minutosFin = nuevaHoraFin.split(":")[1];
    if (minutosInicio !== minutosFin) {
      throw new Error("La hora de inicio y la hora de fin deben tener los mismos minutos");
    }

    // Buscar turnos reservados que todavía deben respetarse
    const turnosReservados = await prisma.turno.findMany({
        where: {
            idCancha: id,
            estado: "RESERVADO",
            fecha: { gte: obtenerFechaHoy(),},
        },
    });

    const inicioNuevo = horaAMinutos(nuevaHoraInicio);
    const finNuevo = horaAMinutos(nuevaHoraFin);

    // Ningún turno reservado puede quedar fuera del nuevo horario de funcionamiento
    for (const turno of turnosReservados) {

        const inicioReserva = turno.horaInicio.getUTCHours() * 60 + turno.horaInicio.getUTCMinutes();
        const finReserva = inicioReserva + 60;

        if ( inicioReserva < inicioNuevo || finReserva > finNuevo) {
            throw new Error("No se puede modificar el horario porque existe un turno reservado fuera del nuevo horario");
        }
    }

    datos.horaInicio = crearHora(nuevaHoraInicio);
    datos.horaFin = crearHora(nuevaHoraFin);
  }

  const canchaActualizada = await prisma.cancha.update({
    where: {
      id: id,
    },
    data: datos,
  });



//acutualizar los turnos si se modifica horario y/o precio

  const hoy = obtenerFechaHoy();

    if (cambiaHorario) {
        await prisma.turno.deleteMany({
            where: {
                idCancha: id,
                estado: "DISPONIBLE",
                fecha: {gte: hoy, },
            },
        });
    
    if (canchaActualizada.activa) {
      await generarTurnosParaCancha(canchaActualizada);
    }

  } else if (precioTurno !== undefined) {
        await prisma.turno.updateMany({
            where: {
                idCancha: id,
                estado: "DISPONIBLE",
                fecha: { gte: hoy,},
            },
            data: {
            precio: precioNuevo,
            },
        });
    }


    if (activa === false) { // Al desactivar la cancha, las reservas permanecen, pero se eliminan turnos futuros
        await prisma.turno.deleteMany({
            where: {
            idCancha: id,
            estado: "DISPONIBLE",
            fecha: {gte: hoy,},
            },
        });
    } else if (activa === true && !cambiaHorario) { // Al reactivar la cancha se dan de alta otra vez los turnos
    await generarTurnosParaCancha(canchaActualizada);
  }



  return canchaActualizada;
}


function esHoraValida(hora) {
  return (
    typeof hora === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(hora)
  );
}


function crearHora(hora) {

  const [horas, minutos] = hora.split(":").map(Number);

  return new Date(
    Date.UTC(1970, 0, 1, horas, minutos, 0)
  );
}

function convertirHoraAString(hora) {

  const horas = String(
    hora.getUTCHours()
  ).padStart(2, "0");

  const minutos = String(
    hora.getUTCMinutes()
  ).padStart(2, "0");

  return `${horas}:${minutos}`;
}

function horaAMinutos(hora) {

  const [horas, minutos] = hora.split(":").map(Number);

  return horas * 60 + minutos;
}


function obtenerFechaHoy() {

  const hoy = new Date();

  return new Date(
    Date.UTC(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate()
    )
  );
}