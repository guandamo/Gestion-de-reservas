/**
 * Tests de integración para `crearReserva`.
 *
 * Cubre las invariantes críticas que la pantalla de reservar y el flujo de
 * pago dependen:
 *   - Una reserva nueva se crea en estado PENDIENTE con `vencimientoAt`
 *     aproximadamente 3 minutos en el futuro.
 *   - El turno asociado pasa a RESERVADO y deja de estar disponible para
 *     otros usuarios.
 *   - Un segundo intento sobre el mismo turno es rechazado (race condition).
 *   - Validaciones de entrada (sin sesión, IDs inválidos, turno inexistente).
 *
 * El test corre contra la BD real pero crea sus propios datos con un nombre
 * marcador y los limpia al final.
 */

import { prisma } from "../src/config/prisma.js";
import { HttpError } from "../src/utils/httpError.js";
import { crearReserva } from "../src/services/reserva/crearReserva.js";

const MARCA = "__test_reservas__";

let fallos = 0;
const creados = { canchas: [], turnos: [], reservas: [], usuarios: [] };

async function check(nombre, condicion, detalle = "") {
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

async function asegurarUsuario(email, nombre) {
  let usuario = await prisma.usuario.findUnique({ where: { email } });
  if (usuario) return usuario;
  usuario = await prisma.usuario.create({
    data: {
      nombre,
      apellido: "Test",
      email,
      contrasena: "x", // no nos importa, no se hace login en este test
      rol: "USUARIO",
      activo: true,
      ultimoCambio: "ALTA",
    },
  });
  creados.usuarios.push(usuario.id);
  return usuario;
}

async function main() {
  console.log("\n--- Caso 1: crear reserva en turno DISPONIBLE ---");
  const tipo = await prisma.tipoCancha.findFirst();
  if (!tipo) throw new Error("Necesita un TipoCancha precargado.");

  const usuarioA = await asegurarUsuario(`a-${MARCA}@test.com`, "A");
  const usuarioB = await asegurarUsuario(`b-${MARCA}@test.com`, "B");

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
  creados.canchas.push(cancha.id);

  const t1 = await prisma.turno.create({
    data: {
      fecha: manana(),
      horaInicio: hora(9),
      precio: 1000,
      estado: "DISPONIBLE",
      idCancha: cancha.id,
    },
  });
  creados.turnos.push(t1.id);

  const antes = Date.now();
  const r = await crearReserva({ idUsuario: usuarioA.id, idTurno: t1.id });
  const despues = Date.now();

  check("devuelve success", r.success === true);
  check("reserva.id es entero positivo", Number.isSafeInteger(r.reservationId));
  check("estado PENDIENTE", r.status === "PENDIENTE");
  check("estado interno PENDIENTE", r.reserva.estado === "PENDIENTE");
  check("vencimientoAt ~3 min en el futuro", (() => {
    const v = new Date(r.reserva.vencimientoAt).getTime();
    return v >= antes + 170_000 && v <= despues + 200_000;
  })());
  creados.reservas.push(r.reservationId);

  const turnoLeido = await prisma.turno.findUnique({ where: { id: t1.id } });
  check("turno pasó a RESERVADO", turnoLeido.estado === "RESERVADO");

  console.log("\n--- Caso 2: segundo intento sobre mismo turno → 409 ---");
  try {
    await crearReserva({ idUsuario: usuarioB.id, idTurno: t1.id });
    check("segundo intento es rechazado", false, "no lanzó");
  } catch (e) {
    check(
      "lanza 409 con mensaje de turno ocupado",
      e instanceof HttpError && e.status === 409,
      e?.message,
    );
  }

  console.log("\n--- Caso 3: turno inexistente → 404 ---");
  try {
    await crearReserva({ idUsuario: usuarioA.id, idTurno: 9_999_999 });
    check("lanza en turno inexistente", false);
  } catch (e) {
    check(
      "lanza 404",
      e instanceof HttpError && e.status === 404,
      e?.message,
    );
  }

  console.log("\n--- Caso 4: idTurno inválido → 400 ---");
  try {
    await crearReserva({ idUsuario: usuarioA.id, idTurno: "abc" });
    check("lanza en id inválido", false);
  } catch (e) {
    check(
      "lanza 400",
      e instanceof HttpError && e.status === 400,
      e?.message,
    );
  }

  console.log("\n--- Caso 5: sin usuario autenticado → 401 ---");
  try {
    await crearReserva({ idTurno: t1.id });
    check("lanza sin usuario", false);
  } catch (e) {
    check(
      "lanza 401",
      e instanceof HttpError && e.status === 401,
      e?.message,
    );
  }

  console.log(
    fallos === 0
      ? "\nRESULTADO: todas las aserciones pasaron\n"
      : `\nRESULTADO: ${fallos} fallo(s)\n`,
  );
}

async function limpiar() {
  await prisma.reserva.deleteMany({ where: { id: { in: creados.reservas } } });
  await prisma.turno.deleteMany({ where: { id: { in: creados.turnos } } });
  await prisma.cancha.deleteMany({ where: { id: { in: creados.canchas } } });
  if (creados.usuarios.length) {
    await prisma.usuario.deleteMany({ where: { id: { in: creados.usuarios } } });
  }
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
