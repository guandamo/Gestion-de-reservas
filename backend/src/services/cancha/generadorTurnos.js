import { prisma } from "../../config/prisma.js";  //trae la conexión a PostgreSQL

const DIAS_A_GENERAR = 30;

export async function generarTurnos() {   //busca las canchas que estan activas
  const canchas = await prisma.cancha.findMany({  //prisma lo traduce a sql y lo ejecuta en la base de datos
    where: {
      activa: true,
    },
  });

  for (const cancha of canchas) {  //es mas eficiente que consultar turno por turno, generaria muchas consultas a la base de datos, esto genera todo en memoria y despues
    await generarTurnosParaCancha(cancha); //inserta en conjunto evaluando cual existe y cuakl no
  }
  }
      
  export async function generarTurnosParaCancha(cancha) {

    const turnosReservados = await prisma.turno.findMany({ //busco los turnos reservados de la caancha si los hay
      where: { 
        idCancha: cancha.id,
        estado: "RESERVADO",
        fecha: {gte: obtenerFecha(0),},
    },
    });


    const horaInicial = cancha.horaInicio.getUTCHours();   
    const horaFinal = cancha.horaFin.getUTCHours();
    const minutos = cancha.horaInicio.getUTCMinutes();
    const turnos = [];
    
    for (let dia = 0; dia < DIAS_A_GENERAR; dia++) {
        const fecha = obtenerFecha(dia);
        for (let hora = horaInicial; hora < horaFinal; hora++) {
            const horaInicio = crearHora(hora, minutos);
          
            //inicio logica de superpocision de nuevos turnos con los reservados
            const inicioNuevo = horaInicio.getUTCHours() * 60 + horaInicio.getUTCMinutes();
            const finNuevo = inicioNuevo + 60;

            const seSuperpone = turnosReservados.some((turnoReservado) => {
              if (turnoReservado.fecha.getTime() !== fecha.getTime()) {
                return false;
              }

              const inicioReservado = turnoReservado.horaInicio.getUTCHours() * 60 + turnoReservado.horaInicio.getUTCMinutes();
              const finReservado = inicioReservado + 60;

              return ( inicioNuevo < finReservado && finNuevo > inicioReservado
            );
            });

            //fin logica de superposicion de turnos reservados

          if (!seSuperpone) {
            turnos.push({
                fecha: fecha,
                horaInicio: horaInicio,
                precio: cancha.precioTurno,
                idCancha: cancha.id,
            });
          }
    
        }
   }
   await prisma.turno.createMany({
    data: turnos,
    skipDuplicates: true,  //ignora y no inserta los turnos que ya existen (restriccion unique en postgersql)
    });

  }


function obtenerFecha(diasDesdeHoy) { //devuelve en formato fecha, la fecha de hoy mas diasDesdeHoy (parametro)
  const hoy = new Date();

  return new Date(
    Date.UTC(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate() + diasDesdeHoy
    )
  );
}

function crearHora(hora, minutos) { // aunque PostgreSQL guarde solo la hora, prisma admite el formato datetime completo, la fecha es una cualquera
  return new Date(Date.UTC(1888, 0, 1, hora, minutos, 0));
}