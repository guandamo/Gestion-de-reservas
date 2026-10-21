import { INTERVALO_SWEEP_MS, INTERVALO_TURNOS_MS } from "../config/expiracion.js";
import { expirarReservasPendientes } from "../services/reserva/expirarReservasPendientes.js";
import { generarTurnos } from "../services/cancha/generadorTurnos.js";

/**
 * Scheduler del backend.
 *
 * Corre dos trabajos:
 *  1. Barrido de reservas vencidas (cada ~30 s).
 *  2. Regeneración de los turnos de las canchas activas (cada ~6 h).
 *
 * Decisiones importantes:
 *  - El estado vive en la base (no en memoria ni en timers del cliente), así
 *    que un reinicio del backend no pierde nada: al arrancar se ejecuta una
 *    pasada inmediata que recupera lo que venció durante el corte.
 *  - `setInterval` + `unref()` para que el timer no mantenga vivo el proceso.
 *  - Flag `enCurso` para que una tanda lenta no se solape con la siguiente.
 *  - Todo error se captura y se registra: un fallo de una pasada nunca debe
 *    tumbar el servidor de API.
 */

let timer = null;
let timerTurnos = null;
let enCurso = false;
let enCursoTurnos = false;

async function ejecutarSweep() {
  if (enCurso) return;

  enCurso = true;

  try {
    const resultado = await expirarReservasPendientes();

    if (resultado.expiradas > 0) {
      console.info(
        `[sweep] ${resultado.expiradas} reserva(s) vencida(s) liberada(s), ` +
          `${resultado.turnosLiberados} turno(s) vuelven a DISPONIBLE`,
      );
    }
  } catch (error) {
    console.error("[sweep] Falló la pasada de expiración", {
      mensaje: error?.message,
    });
  } finally {
    enCurso = false;
  }
}

/**
 * Genera los turnos faltantes de todas las canchas activas.
 *
 * `generarTurnosParaCancha` crea los 30 días siguientes y usa
 * `createMany({ skipDuplicates: true })`, así que correrla de más no duplica
 * nada ni pisa los turnos RESERVADO (los saltea por solapamiento).
 */
async function ejecutarTurnos() {
  if (enCursoTurnos) return;

  enCursoTurnos = true;

  try {
    await generarTurnos();
  } catch (error) {
    console.error("[turnos] Falló la regeneración de turnos", {
      mensaje: error?.message,
    });
  } finally {
    enCursoTurnos = false;
  }
}

export function iniciarJobs() {
  if (timer) return;

  // Pasada inmediata al arrancar: recupera lo que quedó pendiente durante un
  // reinicio o caída previa del backend.
  void ejecutarSweep();
  void ejecutarTurnos();

  timer = setInterval(() => void ejecutarSweep(), INTERVALO_SWEEP_MS);
  timer.unref?.();

  timerTurnos = setInterval(() => void ejecutarTurnos(), INTERVALO_TURNOS_MS);
  timerTurnos.unref?.();

  console.info(
    `[jobs] Barrido de reservas vencidas activo (cada ${Math.round(
      INTERVALO_SWEEP_MS / 1000,
    )}s) y regeneración de turnos activa (cada ${Math.round(
      INTERVALO_TURNOS_MS / 60000,
    )} min)`,
  );
}

export function detenerJobs() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (timerTurnos) {
    clearInterval(timerTurnos);
    timerTurnos = null;
  }
}