/**
 * Prueba de integración del barrido de reservas vencidas.
 *
 * Corre contra la base real pero es autolimpiable: crea sus propios datos con
 * un nombre marcador y los elimina al final, incluso si falla alguna aserción.
 */

import { prisma } from "../src/config/prisma.js";
import { expirarReservasPendientes } from "../src/services/reserva/expirarReservasPendientes.js";

const MARCA = "__test_sweep__";

let fallos = 0;
const reservasCreadas = [];

function check(nombre, condicion, detalle = "") {
  if (condicion) {
    console.log(`  OK   ${nombre}`);
  } else {
    fallos += 1;
    console.log(`  FALLA ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  }
}

const manana = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const hora = (h) => new Date(`2026-01-01T${String(h).padStart(2, "0")}:00:00Z`);
const pasado = () => new Date(Date.now() - 60_000);
const futuro = () => new Date(Date.now() + 600_000);

async function main() {
  let tipo = await prisma.tipoCancha.findFirst();
  if (!tipo) tipo = await prisma.tipoCancha.create({ data: { descripcion: `${MARCA}_tipo` } });

  const usuario = await prisma.usuario.findFirst({ where: { rol: "USUARIO" } });
  if (!usuario) throw new Error("No hay ningún usuario USUARIO para la prueba.");

  const cancha = await prisma.cancha.create({
    data: {
      nombre: MARCA,
      activa: true,
      horaInicio: hora(8),
      horaFin: hora(22),
      precioTurno: 1000,
      idTipoCancha: tipo.id,
    },
  });

  const nuevoTurno = async (h) =>
    prisma.turno.create({
      data: { fecha: manana(), horaInicio: hora(h), precio: 1000, estado: "DISPONIBLE", idCancha: cancha.id },
    });

  /** Reserva PENDIENTE sobre un turno tomado. `legacy` = vencimientoAt NULL. */
  const nuevaReserva = async (turno, { vencida, legacy = false }) => {
    await prisma.turno.update({ where: { id: turno.id }, data: { estado: "RESERVADO" } });
    const r = await prisma.reserva.create({
      data: {
        idUsuario: usuario.id,
        idTurno: turno.id,
        estado: "PENDIENTE",
        vencimientoAt: legacy ? null : vencida ? pasado() : futuro(),
      },
    });
    reservasCreadas.push(r.id);
    return r;
  };

  const rDe = (id) => prisma.reserva.findUnique({ where: { id } });
  const tDe = (id) => prisma.turno.findUnique({ where: { id } });

  console.log("\n--- Caso 1: vencida, sin otra reserva activa ---");
  const t1 = await nuevoTurno(8);
  const r1 = await nuevaReserva(t1, { vencida: true });
  const res1 = await expirarReservasPendientes();
  check("reserva CANCELADA", (await rDe(r1.id)).estado === "CANCELADA");
  check("cancelledAt registrado", (await rDe(r1.id)).cancelledAt != null);
  check("turno DISPONIBLE", (await tDe(t1.id)).estado === "DISPONIBLE");
  check("resumen expiradas=1", res1.expiradas === 1, `expiradas=${res1.expiradas}`);
  check("resumen liberados=1", res1.turnosLiberados === 1, `liberados=${res1.turnosLiberados}`);

  console.log("\n--- Caso 2: idempotencia ---");
  const res2 = await expirarReservasPendientes();
  check("no expiró nada", res2.expiradas === 0, `expiradas=${res2.expiradas}`);
  check("turno sigue DISPONIBLE", (await tDe(t1.id)).estado === "DISPONIBLE");

  console.log("\n--- Caso 3: vigente (vencimiento futuro) ---");
  const t3 = await nuevoTurno(9);
  const r3 = await nuevaReserva(t3, { vencida: false });
  const res3 = await expirarReservasPendientes();
  check("sigue PENDIENTE", (await rDe(r3.id)).estado === "PENDIENTE");
  check("turno sigue RESERVADO", (await tDe(t3.id)).estado === "RESERVADO");
  check("resumen en cero", res3.expiradas === 0);

  console.log("\n--- Caso 4: legacy (vencimientoAt NULL) ---");
  const t4 = await nuevoTurno(10);
  const r4 = await nuevaReserva(t4, { vencida: true, legacy: true });
  const res4 = await expirarReservasPendientes();
  check("no se toca", (await rDe(r4.id)).estado === "PENDIENTE");
  check("turno sigue RESERVADO", (await tDe(t4.id)).estado === "RESERVADO");
  check("resumen en cero", res4.expiradas === 0);

  console.log("\n--- Caso 5: CONFIRMADA no se toca ---");
  const t5 = await nuevoTurno(11);
  const r5 = await nuevaReserva(t5, { vencida: true });
  await prisma.reserva.update({ where: { id: r5.id }, data: { estado: "CONFIRMADA" } });
  const res5 = await expirarReservasPendientes();
  check("sigue CONFIRMADA", (await rDe(r5.id)).estado === "CONFIRMADA");
  check("turno sigue RESERVADO", (await tDe(t5.id)).estado === "RESERVADO");
  check("resumen en cero", res5.expiradas === 0);

  console.log("\n--- Caso 6: vencida con otra reserva activa en el turno ---");
  const t6 = await nuevoTurno(12);
  const r6a = await nuevaReserva(t6, { vencida: true });
  const r6b = await prisma.reserva.create({
    data: { idUsuario: usuario.id, idTurno: t6.id, estado: "CONFIRMADA", vencimientoAt: pasado() },
  });
  reservasCreadas.push(r6b.id);
  const res6 = await expirarReservasPendientes();
  check("la vencida se canceló", (await rDe(r6a.id)).estado === "CANCELADA");
  check("la otra activa sobrevive", (await rDe(r6b.id)).estado === "CONFIRMADA");
  check("el turno NO se liberó", (await tDe(t6.id)).estado === "RESERVADO", `estado=${(await tDe(t6.id)).estado}`);
  check("resumen liberados=0", res6.turnosLiberados === 0, `liberados=${res6.turnosLiberados}`);
  check("resumen expiradas=1", res6.expiradas === 1, `expiradas=${res6.expiradas}`);

  console.log("\n--- Caso 7: auditoria ---");
  const logs = await prisma.auditLog.findMany({
    where: { entity: "Reserva", entityId: r1.id, operation: "EXPIRE_RESERVATION" },
  });
  check("EXPIRE_RESERVATION registrado", logs.length === 1, `logs=${logs.length}`);
  check("motivo correcto", logs[0]?.newValues?.motivo === "VENCIMIENTO_SIN_PAGO");
  check("performedBy null (sistema)", logs[0]?.performedBy === null);

  console.log(
    fallos === 0 ? "\nRESULTADO: todas las aserciones pasaron\n" : `\nRESULTADO: ${fallos} fallo(s)\n`,
  );
}

async function limpiar() {
  await prisma.auditLog.deleteMany({
    where: { entity: "Reserva", entityId: { in: reservasCreadas } },
  });
  await prisma.reserva.deleteMany({ where: { id: { in: reservasCreadas } } });
  await prisma.turno.deleteMany({ where: { cancha: { nombre: MARCA } } });
  await prisma.cancha.deleteMany({ where: { nombre: MARCA } });
  await prisma.tipoCancha.deleteMany({ where: { descripcion: `${MARCA}_tipo` } });
}

main()
  .then(async () => {
    await limpiar();
    await prisma.$disconnect();
    process.exit(fallos === 0 ? 0 : 1);
  })
  .catch(async (e) => {
    console.error("ERROR:", e);
    await limpiar().catch(() => {});
    await prisma.$disconnect();
    process.exit(1);
  });