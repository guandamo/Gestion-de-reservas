/**
 * Tests de "Mis reservas": orden por antigüedad y pago de una reserva
 * pendiente sin que se reinicie el reloj.
 *
 * Cubre lo que el usuario pidió:
 *
 *   1. `listarMisReservas` devuelve la reserva más reciente primero y la más
 *      vieja última, ordenando por `fechaAlta` (cuándo se reservó) y no por
 *      `turno.fecha` (cuándo se juega).
 *
 *   2. Una reserva PENDIENTE dentro de la ventana de 3 minutos se puede pagar:
 *      `crearPreferenciaPago` devuelve un checkout.
 *
 *   3. **Los 3 minutos NO se reinician.** Pedir una segunda preferencia para
 *      la misma reserva pendiente no mueve `vencimientoAt`: sigue siendo el
 *      deadline original. Es lo que permite que el usuario salga de MP sin
 *      pagar, vuelva, y le quede el tiempo que realmente le quedaba y no uno
 *      nuevo. Si esto se rompe, el turno queda bloqueado indefinidamente por
 *      reintentos.
 *
 * ── Sobre los datos de prueba ────────────────────────────────────────────
 * NO crea ninguna Cancha: el job `generarTurnos` del backend le genera los
 * 30 días siguientes de turnos a toda cancha `activa` y una cancha de prueba
 * deja ~420 filas huérfanas en la base. Reutiliza una cancha activa real y
 * crea turnos sueltos a 90 días, fuera de esa ventana.
 */

import { prisma } from "../src/config/prisma.js";
import { HttpError } from "../src/utils/httpError.js";
import { crearPreferenciaPago } from "../src/services/pago/crearPreferenciaPago.js";
import { listarMisReservas } from "../src/services/reserva/listarMisReservas.js";

const MARCA = "__test_mis_reservas__";

let fallos = 0;
const creados = { turnos: [], reservas: [], usuarios: [], pagos: [] };

async function check(nombre, condicion, detalle = "") {
  if (condicion) {
    console.log(`  OK    ${nombre}`);
  } else {
    fallos += 1;
    console.log(`  FALLA ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  }
}

const hora = (h) => new Date(`2026-01-01T${String(h).padStart(2, "0")}:00:00Z`);

function enDias(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function asegurarUsuario(email) {
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) return existente;

  const usuario = await prisma.usuario.create({
    data: {
      nombre: "Test",
      apellido: "MisReservas",
      email,
      contrasena: "x",
      rol: "USUARIO",
      activo: true,
      ultimoCambio: "ALTA",
    },
  });
  creados.usuarios.push(usuario.id);
  return usuario;
}

async function crearTurno(idCancha, dia, h, precio = 1000) {
  const turno = await prisma.turno.create({
    data: {
      fecha: enDias(dia),
      horaInicio: hora(h),
      precio,
      estado: "RESERVADO",
      idCancha,
    },
  });
  creados.turnos.push(turno.id);
  return turno;
}

/**
 * Crea una reserva con `fechaAlta` explícita, para poder construir una
 * antigüedad conocida sin esperar entre llamadas.
 */
async function crearReserva(idUsuario, idTurno, { fechaAlta, vencimientoAt }) {
  const reserva = await prisma.reserva.create({
    data: {
      idUsuario,
      idTurno,
      estado: "PENDIENTE",
      fechaAlta,
      vencimientoAt,
    },
  });
  creados.reservas.push(reserva.id);
  return reserva;
}

async function main() {
  const cancha = await prisma.cancha.findFirst({ where: { activa: true } });
  if (!cancha) throw new Error("Necesita al menos una Cancha activa.");

  const usuario = await asegurarUsuario(`user-${MARCA}@test.com`);
  const ahora = Date.now();

  // ─────────────────────────────────────────────────────────────────────
  console.log("\n--- Caso 1: orden por antigüedad (fechaAlta desc) ---");

  // Se crean en orden cronológico INVERSO a propósito: el orden de inserción
  // no es el orden esperado, así que un `orderBy` ausente o mal puesto se
  // delata. Ojo al par fechaAlta / turno.fecha: la reserva más reciente juega
  // el turno más LEJANO, que es justo lo que el orden anterior invertía.
  const hace3dias = new Date(ahora - 3 * 24 * 60 * 60 * 1000);
  const hace1dia = new Date(ahora - 24 * 60 * 60 * 1000);
  const hace1hora = new Date(ahora - 60 * 60 * 1000);

  const turnoLejano = await crearTurno(cancha.id, 90, 9);
  const turnoMedio = await crearTurno(cancha.id, 60, 10);
  const turnoCercano = await crearTurno(cancha.id, 45, 11);

  const vieja = await crearReserva(usuario.id, turnoLejano.id, {
    fechaAlta: hace3dias,
    vencimientoAt: null,
  });
  const media = await crearReserva(usuario.id, turnoMedio.id, {
    fechaAlta: hace1dia,
    vencimientoAt: null,
  });
  const reciente = await crearReserva(usuario.id, turnoCercano.id, {
    fechaAlta: hace1hora,
    // Vigente: se usa en el caso 3.
    vencimientoAt: new Date(ahora + 180_000),
  });

  const lista = await listarMisReservas({ idUsuario: usuario.id });
  const orden = lista.map((r) => r.id);

  console.log(
    `        esperada [${reciente.id}, ${media.id}, ${vieja.id}] (más nueva → más vieja)`,
  );
  console.log(`        obtenida [${orden.join(", ")}]`);

  check(
    "la más reciente creada va primera",
    orden[0] === reciente.id,
    `obtuvo ${orden[0]}`,
  );
  check("la intermedia va segunda", orden[1] === media.id, `obtuvo ${orden[1]}`);
  check("la más vieja va última", orden[2] === vieja.id, `obtuvo ${orden[2]}`);

  // Si el orden fuera por turno.fecha, la más nueva (turno a 45 días) caería
  // última, detrás de la vieja (turno a 90 días). Esta comprobación aísla
  // exactamente esa confusión.
  check(
    "no ordena por turno.fecha (que invertiría la lista)",
    orden.join(",") !== [vieja.id, media.id, reciente.id].join(","),
  );

  // ─────────────────────────────────────────────────────────────────────
  console.log("\n--- Caso 2: expiresAt viaja en la respuesta ---");
  const itemReciente = lista.find((r) => r.id === reciente.id);
  check(
    "la pendiente vigente expone vencimientoAt",
    typeof itemReciente?.vencimientoAt === "string" &&
      new Date(itemReciente.vencimientoAt).getTime() > ahora,
    JSON.stringify(itemReciente?.vencimientoAt),
  );
  check(
    "la reserva vieja (sin vencimiento) expone null",
    lista.find((r) => r.id === vieja.id)?.vencimientoAt === null,
  );

  // ─────────────────────────────────────────────────────────────────────
  console.log("\n--- Caso 3: pedir la preferencia NO reinicia los 3 minutos ---");

  const antes = (
    await prisma.reserva.findUnique({ where: { id: reciente.id } })
  ).vencimientoAt;
  console.log(`        vencimientoAt original: ${antes.toISOString()}`);

  let primerPago = null;
  try {
    primerPago = await crearPreferenciaPago({
      idReserva: reciente.id,
      idUsuario: usuario.id,
    });
    check("1er intento devuelve preference", Boolean(primerPago?.checkoutUrl));
  } catch (e) {
    // Sin credenciales de MP el servicio responde 502; reaching that point
    // igual means the 409 guard did NOT fire.
    check(
      "1er intento no choca contra el vencimiento (MP puede fallar)",
      e instanceof HttpError && e.status === 502,
      e?.message,
    );
  }
  if (primerPago?.idPago) creados.pagos.push(primerPago.idPago);

  const trasPrimero = (
    await prisma.reserva.findUnique({ where: { id: reciente.id } })
  ).vencimientoAt;
  check(
    "tras el 1er intento el vencimiento es el MISMO",
    trasPrimero.getTime() === antes.getTime(),
    `${antes.toISOString()} -> ${trasPrimero.toISOString()}`,
  );

  // Segundo intento: el caso real de "salí de MP sin pagar y volví".
  let segundoPago = null;
  try {
    segundoPago = await crearPreferenciaPago({
      idReserva: reciente.id,
      idUsuario: usuario.id,
    });
    check("2do intento devuelve preference", Boolean(segundoPago?.checkoutUrl));
  } catch (e) {
    check(
      "2do intento no choca contra el vencimiento (MP puede fallar)",
      e instanceof HttpError && e.status === 502,
      e?.message,
    );
  }
  if (segundoPago?.idPago) creados.pagos.push(segundoPago.idPago);

  const trasSegundo = (
    await prisma.reserva.findUnique({ where: { id: reciente.id } })
  ).vencimientoAt;
  check(
    "tras el 2do intento el vencimiento SIGUE siendo el mismo",
    trasSegundo.getTime() === antes.getTime(),
    `${antes.toISOString()} -> ${trasSegundo.toISOString()}`,
  );

  // El caso límite: vencida la ventana, un reintento NO la revive.
  await prisma.reserva.update({
    where: { id: reciente.id },
    data: { vencimientoAt: new Date(ahora - 1000) },
  });

  let tercerPago = null;
  try {
    tercerPago = await crearPreferenciaPago({
      idReserva: reciente.id,
      idUsuario: usuario.id,
    });
    check("reintento con la ventana vencida es rechazado", false, "no lanzó");
  } catch (e) {
    check(
      "reintento con la ventana vencida devuelve 409",
      e instanceof HttpError && e.status === 409,
      e?.message,
    );
    check(
      "el mensaje dice que la reserva venció",
      typeof e?.message === "string" && /venci/i.test(e.message),
      e?.message,
    );
  }
  if (tercerPago?.idPago) creados.pagos.push(tercerPago.idPago);

  const trasTercero = (
    await prisma.reserva.findUnique({ where: { id: reciente.id } })
  ).vencimientoAt;
  check(
    "el rechazo tampoco movió el vencimiento",
    trasTercero.getTime() === antes - 180_000 - 1000,
    trasTercero.toISOString(),
  );

  console.log(
    fallos === 0
      ? "\nRESULTADO: todas las aserciones pasaron\n"
      : `\nRESULTADO: ${fallos} fallo(s)\n`,
  );
}

async function limpiar() {
  if (creados.reservas.length) {
    await prisma.auditLog.deleteMany({
      where: { entity: "Reserva", entityId: { in: creados.reservas } },
    });
  }
  if (creados.pagos.length) {
    await prisma.pago.deleteMany({ where: { id: { in: creados.pagos } } });
  }
  if (creados.reservas.length) {
    await prisma.reserva.deleteMany({ where: { id: { in: creados.reservas } } });
  }
  // Por id puntual, nunca por idCancha: el generador de turnos del backend
  // puede haber agregado filas a esa cancha y no son de este test.
  if (creados.turnos.length) {
    await prisma.turno.deleteMany({ where: { id: { in: creados.turnos } } });
  }
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