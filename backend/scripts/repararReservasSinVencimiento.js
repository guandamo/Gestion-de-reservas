/**
 * Reparación de datos: reservas PENDIENTE con `vencimientoAt = NULL`.
 *
 * Estas filas no se van a expirar nunca. El sweep busca
 *   WHERE estado = 'PENDIENTE' AND "vencimientoAt" <= now()
 * y `NULL <= now()` nunca da verdadero, así que quedan PENDIENTE para
 * siempre con su turno en RESERVADO: slots que nadie puede reservar.
 *
 * El script NO borra nada ni inventa estados. Hace dos cosas:
 *
 *   1. Backfillea `vencimientoAt` con `fechaAlta + 3 minutos`, que es el plazo
 *      que la reserva habría tenido si se hubiera creado con el código actual.
 *      Como la fecha queda en el pasado, el sweep las recoge en su próxima
 *      pasada (<= 30 s).
 *
 *   2. Corre el sweep una vez para no tener que esperar, y liberar un turno
 *      RESERVADO que no tiene ninguna reserva activa associated.
 *
 * La cancelación de las reservas y la liberación de los turnos las hace
 * `expirarReservasPendientes`, o sea el mismo código de producción ya probado
 * (con flip condicional, transacción Serializable y audit trail). Este script
 * sólo prepara los datos para que ese código pueda trabajar.
 *
 * Es idempotente: al terminar no queda ninguna PENDIENTE con vencimientoAt NULL,
 * y volver a correrlo no cambia nada.
 *
 *   node scripts/repararReservasSinVencimiento.js
 *
 * Para ver qué haría sin tocar nada:
 *   node scripts/repararReservasSinVencimiento.js --dry-run
 */

import "dotenv/config";
import { prisma } from "../src/config/prisma.js";
import { expirarReservasPendientes } from "../src/services/reserva/expirarReservasPendientes.js";

const DRY_RUN = process.argv.includes("--dry-run");

const PLASO_MIN = 3;

function log(...args) {
  console.log(...args);
}

async function main() {
  log(`\n${DRY_RUN ? "[dry-run] " : ""}Reparación de reservas sin vencimiento\n${"=".repeat(50)}`);

  // --- 1. Diagnóstico previo -------------------------------------------
  const aReparar = await prisma.reserva.findMany({
    where: { estado: "PENDIENTE", vencimientoAt: null },
    select: { id: true, fechaAlta: true, idTurno: true },
  });

  const conPago = await prisma.reserva.count({
    where: {
      estado: "PENDIENTE",
      vencimientoAt: null,
      pago: { OR: [{ estado: "PAGADO" }, { idMercadoPago: { not: null } }] },
    },
  });

  log(`Reservas PENDIENTE sin vencimiento: ${aReparar.length}`);

  if (conPago > 0) {
    log(
      `\nABORTO: ${conPago} de esas reservas tienen un pago asociado ` +
        `(PAGADO o con idMercadoPago). Cancelarlas podría perder plata.`,
    );
    log("Revisá a mano antes de seguir.\n");
    process.exit(1);
  }

  if (aReparar.length === 0) {
    log("Nada que reparar. La base está consistente.\n");
    return;
  }

  const turnosAfectados = new Set(aReparar.map((r) => r.idTurno));
  log(`Turnos distintos afectados: ${turnosAfectados.size}`);
  log(`Ninguna tiene pago asociado: OK\n`);

  if (DRY_RUN) {
    log("[dry-run] No se escribió nada. Ejecución real sin --dry-run.\n");
    return;
  }

  // --- 2. Backfill ------------------------------------------------------
  // updateMany no puede hacer aritmética por fila (necesitamos
  // fechaAlta + intervalo), así que se actualiza una por una. Son pocas
  // (decenas) y el script es de una sola vez.
  let backfilled = 0;
  for (const r of aReparar) {
    const vencimiento = new Date(
      new Date(r.fechaAlta).getTime() + PLASO_MIN * 60 * 1000,
    );
    const res = await prisma.reserva.updateMany({
      where: { id: r.id, estado: "PENDIENTE", vencimientoAt: null },
      data: { vencimientoAt: vencimiento },
    });
    backfilled += res.count;
  }
  log(`Backfill: ${backfilled} reservas con vencimientoAt = fechaAlta + ${PLASO_MIN}min`);

  // --- 3. Que el sweep haga el trabajo ---------------------------------
  log("\nCorriendo el sweep...\n");
  const resultado = await expirarReservasPendientes();
  log(
    `  revisadas=${resultado.revisadas}  expiradas=${resultado.expiradas}  ` +
      `turnos liberados=${resultado.turnosLiberados}`,
  );

  // --- 4. Turnos huérfanos (RESERVADO sin reserva activa) ---------------
  const reservados = await prisma.turno.findMany({
    where: { estado: "RESERVADO" },
    select: { id: true },
  });

  const huerfanos = [];
  for (const t of reservados) {
    const activa = await prisma.reserva.count({
      where: { idTurno: t.id, estado: { in: ["PENDIENTE", "CONFIRMADA"] } },
    });
    if (activa === 0) huerfanos.push(t.id);
  }

  if (huerfanos.length === 0) {
    log("\nSin turnos huérfanos.");
  } else {
    log(`\nTurnos RESERVADO sin ninguna reserva activa: ${huerfanos.length}`);
    log(`  ${huerfanos.join(", ")}`);
    const res = await prisma.turno.updateMany({
      where: { id: { in: huerfanos }, estado: "RESERVADO" },
      data: { estado: "DISPONIBLE" },
    });
    log(`  liberados: ${res.count}`);
  }

  // --- 5. Verificación --------------------------------------------------
  const restantes = await prisma.reserva.count({
    where: { estado: "PENDIENTE", vencimientoAt: null },
  });
  const porEstado = await prisma.turno.groupBy({
    by: ["estado"],
    _count: { _all: true },
  });

  log("\n" + "=".repeat(50));
  log(`PENDIENTE sin vencimiento que quedan: ${restantes}`);
  log("Turnos ahora:");
  for (const e of porEstado) log(`  ${e.estado.padEnd(12)} ${e._count._all}`);
  log("\nListo.\n");
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());