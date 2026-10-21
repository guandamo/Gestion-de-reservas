/**
 * Test de los límites de fecha en hora de Argentina (utils/dates.js).
 *
 * Corre sin base de datos y sin servidor: son funciones puras sobre Dates.
 *
 *   node tests/fechas-zona-horaria.js
 *
 * Los casos están tomados de fechas reales que aparecieron en la base: la
 * reserva #192 (creada a las 20:17:46 de Argentina, guardada como 23:17:46Z) y
 * las reservas #101/#102/#103, que quedaron con la fecha corrida al día
 * siguiente por hacerse de noche.
 */

import assert from "node:assert/strict";
import {
  startOfDay,
  endOfDay,
  fechaClave,
  maxReservaDate,
  startOfMonth,
  endOfMonth,
  isWithinReservaRange,
} from "../src/utils/dates.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✘ ${name}`);
    console.log(`      ${err.message}`);
  }
}

/** Hora de pared de Argentina -> instante UTC ISO (Argentina va 3h atrás). */
const AR = (y, m, d, hh = 0, mm = 0, ss = 0, ms = 0) =>
  new Date(Date.UTC(y, m - 1, d, hh, mm, ss, ms) + 3 * 3_600_000).toISOString();

const clave = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);

console.log("\nClaves de fecha (columnas `date`: Turno.fecha)");

test("startOfDay del instante de la reserva #192 da la fecha correcta", () => {
  // Creada a las 20:17:46 AR = 23:17:46Z del 21/10. Antes se comparaba con
  // getters locales y, con la fecha corrida, podía dar el 22.
  const inst = new Date("2026-10-21T23:17:46.302Z");
  assert.equal(startOfDay(inst).toISOString().slice(0, 10), "2026-10-21");
});

test("startOfDay de un instante en el cierre de Argentina va al día anterior en UTC", () => {
  // 21/10 23:30 AR = 22/10 02:30Z: en Argentina es 21, en UTC es 22.
  // startOfDay mira la hora de Argentina, así que tiene que devolver el 21.
  const inst = new Date("2026-10-22T02:30:00.000Z");
  assert.equal(startOfDay(inst).toISOString().slice(0, 10), "2026-10-21");
});

test("un turno de HOY se puede reservar (su clave ES la clave de hoy)", () => {
  // La clave del turno de hoy tiene que coincidir exactamente con startOfDay.
  // Si no, `desdeDate < hoy` en obtenerDisponibilidad rechazaría el día en curso.
  const hoy = startOfDay();
  assert.equal(hoy.toISOString(), `${hoy.toISOString().slice(0, 10)}T00:00:00.000Z`);
  assert.ok(isWithinReservaRange(hoy, hoy));
});

test("startOfDay y endOfDay devuelven la MISMA clave (columna `date`)", () => {
  const inst = new Date("2026-10-21T23:17:46.302Z");
  assert.equal(
    startOfDay(inst).toISOString(),
    endOfDay(inst).toISOString(),
    "con columnas date, { gte: startOfDay, lte: endOfDay } cubre el día entero",
  );
});

test("fechaClave(0) es hoy y fechaClave(+1) es mañana", () => {
  assert.equal(fechaClave(0).toISOString().slice(0, 10), startOfDay().toISOString().slice(0, 10));
  const manana = new Date(fechaClave(0).getTime() + 86_400_000);
  assert.equal(fechaClave(1).toISOString(), manana.toISOString());
});

console.log("\nInstantes (columnas timestamptz: Reserva.fechaAlta, Pago.fechaPago)");

test("startOfMonth arranca a las 00:00 de Argentina, no a las 00:00Z", () => {
  assert.equal(startOfMonth("2026-10").toISOString(), AR(2026, 10, 1, 0, 0));
});

test("endOfMonth cierra a las 23:59:59.999 de Argentina del último día", () => {
  // El bug que se corrigió: hacer Date.UTC(y, m+1, 0, 23,59,59,999) - 3h daba
  // las 20:59 y dejaba fuera los pagos de las 22:00 del día 31.
  const hasta = endOfMonth("2026-10");
  assert.equal(hasta.toISOString(), AR(2026, 10, 31, 23, 59, 59, 999));

  // Un pago a las 22:00 del 31 tiene que caer DENTRO del mes.
  const pago = new Date(AR(2026, 10, 31, 22, 0));
  assert.ok(pago <= hasta, `pago 22:00 del 31 <= ${hasta.toISOString()}`);
});

test("endOfMonth de febrero no bisiesto queda el 28", () => {
  assert.equal(endOfMonth("2026-02").toISOString(), AR(2026, 2, 28, 23, 59, 59, 999));
});

test("endOfMonth de diciembre no se desborda de año", () => {
  assert.equal(endOfMonth("2026-12").toISOString(), AR(2026, 12, 31, 23, 59, 59, 999));
});

test("un pago de las 22:00 del 31 pertenece a octubre, no a noviembre", () => {
  const pago = new Date(AR(2026, 10, 31, 22, 0));
  const enOctubre = pago >= startOfMonth("2026-10") && pago <= endOfMonth("2026-10");
  const enNoviembre = pago >= startOfMonth("2026-11") && pago <= endOfMonth("2026-11");
  assert.equal(enOctubre, true, "tiene que entrar en octubre");
  assert.equal(enNoviembre, false, "no tiene que entrar en noviembre");
});

console.log("\nmaxReservaDate (rango de reserva)");

test("maxReservaDate = hoy + 1 mes, y acota al último día del mes destino", () => {
  const ref = new Date(AR(2026, 1, 31, 12, 0)); // 31/01
  assert.equal(maxReservaDate(ref).toISOString().slice(0, 10), clave(2026, 2, 28));
});

test("maxReservaDate devuelve una clave, no un instante", () => {
  const ref = new Date(AR(2026, 10, 21, 20, 0));
  assert.equal(maxReservaDate(ref).toISOString().slice(0, 10), clave(2026, 11, 21));
});

test("isWithinReservaRange acepta hoy y el máximo, rechaza pasado y excedido", () => {
  const ref = new Date(AR(2026, 10, 21, 20, 0));
  const turno = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
  assert.equal(isWithinReservaRange(turno(2026, 10, 21), ref), true, "hoy");
  assert.equal(isWithinReservaRange(turno(2026, 11, 21), ref), true, "máximo");
  assert.equal(isWithinReservaRange(turno(2026, 10, 20), ref), false, "ayer");
  assert.equal(isWithinReservaRange(turno(2026, 11, 22), ref), false, "al día siguiente");
});

console.log(
  `\n${failed === 0 ? "TODO OK" : "FALLOS"} — ${passed} pasaron, ${failed} fallaron\n`,
);

process.exit(failed === 0 ? 0 : 1);