import { INTERVALO_SWEEP_MS } from "../config/expiracion.js";
import { expirarReservasPendientes } from "../services/reserva/expirarReservasPendientes.js";

/**
 * Scheduler del backend.
 *
 * Por ahora corre un único trabajo: el barrido de reservas vencidas.
 *
 * Decisiones importantes:
 *  - El estado vive en la base (no en memoria ni en timers del cliente), así
 *    que un reinicio del backend no pierde nada: al arrancar se ejecuta una
 *    pasada inmediata que recupera lo que venció durante el corte.
 *  - `setInterval` + `unref()` para que el timer no mantenga vivo el proceso.
 *  - Flag `enCurso` para que una tanda lenta no se solape con la siguiente.
 *  - Todo error se captura y se registra: un fallo del barrido nunca debe
 *    tumbar el servidor de API.
 */

let timer = null;
let enCurso = false;

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

export function iniciarJobs() {
  if (timer) return;

  // Pasada inmediata al arrancar: recupera lo que quedó pendiente durante un
  // reinicio o caída previa del backend.
  void ejecutarSweep();

  timer = setInterval(() => void ejecutarSweep(), INTERVALO_SWEEP_MS);
  timer.unref?.();

  console.info(
    `[jobs] Barrido de reservas vencidas activo (cada ${Math.round(
      INTERVALO_SWEEP_MS / 1000,
    )}s)`,
  );
}

export function detenerJobs() {
  if (!timer) return;

  clearInterval(timer);
  timer = null;
}