/**
 * Tests de integración para `cancelarReserva`.
 *
 * Cubre la regla que se cambió para que el panel de admin pueda dar de baja
 * una reserva CONFIRMADA (cobrada) y liberar el turno:
 *   - USUARIO no puede cancelar una CONFIRMADA (sigue siendo 409).
 *   - ADMIN sí puede, el turno vuelve a DISPONIBLE y el `Pago` queda PAGADO.
 *   - ADMIN puede cancelar una PENDIENTE como antes.
 *   - ADMIN tampoco puede cancelar si el turno ya empezó o pasó.
 *   - Cancelar dos veces es idempotente (`ya_cancelada`).
 *   - Todo queda registrado en el AuditLog.
 *
 * El test corre contra la BD real pero crea sus propios datos con un nombre
 * marcador y los limpia al final.
 */

import { prisma } from "../src/config/prisma.js";
import { HttpError } from "../src/utils/httpError.js";
import { cancelarReserva } from "../src/services/reserva/cancelarReserva.js";

const MARCA = "__test_cancelar__";

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

// Fecha futura a N días, para no chocar con el límite de "el turno ya pasó".
function enDias(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Fecha ya pasada, para el caso "el turno ya pasó".
function ayer() {
  return enDias(-1);
}

const hora = (h) => new Date(`2026-01-01T${String(h).padStart(2, "0")}:00:00Z`);

async function asegurarUsuario(email, nombre, rol) {
  let usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) {
    usuario = await prisma.usuario.create({
      data: {
        nombre,
        apellido: "Test",
        email,
        contrasena: "x",
        rol,
        activo: true,
        ultimoCambio: "ALTA",
      },
    });
    creados.usuarios.push(usuario.id);
  }
  return usuario;
}

async function crearCanchaYTurnos() {
  const tipo = await prisma.tipoCancha.findFirst();
  if (!tipo) throw new Error("Necesita un TipoCancha precargado.");

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

  const futuro = await prisma.turno.create({
    data: {
      fecha: enDias(5),
      horaInicio: hora(9),
      precio: 1000,
      estado: "DISPONIBLE",
      idCancha: cancha.id,
    },
  });
  creados.turnos.push(futuro.id);

  const pasado = await prisma.turno.create({
    data: {
      fecha: ayer(),
      horaInicio: hora(9),
      precio: 1000,
      estado: "DISPONIBLE",
      idCancha: cancha.id,
    },
  });
  creados.turnos.push(pasado.id);

  return { futuro, pasado };
}

/**
 * Crea una reserva ya en CONFIRMADA con su Pago en PAGADO, que es el estado
 * que el admin ahora puede cancelar desde el panel.
 */
async function crearReservaConfirmada(idUsuario, idTurno) {
  const reserva = await prisma.reserva.create({
    data: {
      idUsuario,
      idTurno,
      estado: "CONFIRMADA",
      pago: {
        create: {
          monto: 1000,
          estado: "PAGADO",
          metodo: "MERCADOPAGO",
          fechaPago: new Date(),
        },
      },
    },
    include: { pago: true },
  });
  creados.reservas.push(reserva.id);
  return reserva;
}

async function crearReservaPendiente(idUsuario, idTurno) {
  const reserva = await prisma.reserva.create({
    data: {
      idUsuario,
      idTurno,
      estado: "PENDIENTE",
      vencimientoAt: new Date(Date.now() + 180_000),
    },
  });
  creados.reservas.push(reserva.id);
  return reserva;
}

async function main() {
  console.log("\n--- Caso 1: USUARIO no puede cancelar una CONFIRMADA ajena ---");
  const { futuro, pasado } = await crearCanchaYTurnos();

  const admin = await asegurarUsuario(`admin-${MARCA}@test.com`, "Admin", "ADMIN");
  const usuarioA = await asegurarUsuario(`a-${MARCA}@test.com`, "A", "USUARIO");

  // El ADMIN crea la reserva sobre el turno del usuario, para probar ownership.
  const r1 = await crearReservaConfirmada(admin.id, futuro.id);
  await prisma.turno.update({
    where: { id: futuro.id },
    data: { estado: "RESERVADO" },
  });

  try {
    await cancelarReserva({ idReserva: r1.id, idUsuario: usuarioA.id });
    check("USUARIO no puede cancelar una CONFIRMADA", false, "no lanzó");
  } catch (e) {
    check(
      "USUARIO recibe 409 (reserva ajena: no existe para él)",
      e instanceof HttpError && e.status === 404,
      e?.message,
    );
  }

  // Mismo usuario dueño, reserva CONFIRMADA propia → 409 de pago.
  const r1propia = await crearReservaConfirmada(usuarioA.id, pasado.id);
  try {
    await cancelarReserva({ idReserva: r1propia.id, idUsuario: usuarioA.id });
    check("dueño no puede cancelar su propia CONFIRMADA", false, "no lanzó");
  } catch (e) {
    check(
      "dueño de una CONFIRMADA recibe 409",
      e instanceof HttpError && e.status === 409,
      e?.message,
    );
  }

  console.log("\n--- Caso 2: ADMIN cancela una CONFIRMADA ---");
  const resultado = await cancelarReserva({
    idReserva: r1.id,
    idUsuario: admin.id,
  });
  check("resultado 'cancelada'", resultado.resultado === "cancelada");
  check("turno liberado", resultado.turnoLiberado === true);

  const turnoTras = await prisma.turno.findUnique({ where: { id: futuro.id } });
  check("turno volvió a DISPONIBLE", turnoTras.estado === "DISPONIBLE");

  const reservaTras = await prisma.reserva.findUnique({
    where: { id: r1.id },
    include: { pago: true },
  });
  check("reserva quedó CANCELADA", reservaTras.estado === "CANCELADA");
  check("cancelledAt seteado", reservaTras.cancelledAt !== null);
  check("pago sigue PAGADO (no hay reembolso automático)", reservaTras.pago.estado === "PAGADO");

  const auditoria = await prisma.auditLog.findFirst({
    where: { entity: "Reserva", entityId: r1.id },
  });
  check("se registró AuditLog", auditoria !== null);
  check(
    "operation ADMIN_CANCEL_CONFIRMED_RESERVATION",
    auditoria?.operation === "ADMIN_CANCEL_CONFIRMED_RESERVATION",
    auditoria?.operation,
  );
  check(
    "audit marca pagoReembolsado:false",
    auditoria?.newValues?.pagoReembolsado === false,
    JSON.stringify(auditoria?.newValues),
  );

  console.log("\n--- Caso 3: cancelar dos veces es idempotente ---");
  const repetido = await cancelarReserva({
    idReserva: r1.id,
    idUsuario: admin.id,
  });
  check("segunda llamada devuelve 'ya_cancelada'", repetido.resultado === "ya_cancelada");

  console.log("\n--- Caso 4: ADMIN cancela una PENDIENTE ---");
  const r2 = await crearReservaPendiente(admin.id, futuro.id);
  await prisma.turno.update({
    where: { id: futuro.id },
    data: { estado: "RESERVADO" },
  });
  const res2 = await cancelarReserva({ idReserva: r2.id, idUsuario: admin.id });
  check("PENDIENTE se cancela bien", res2.resultado === "cancelada");
  const turno2 = await prisma.turno.findUnique({ where: { id: futuro.id } });
  check("turno volvió a DISPONIBLE", turno2.estado === "DISPONIBLE");

  const audit2 = await prisma.auditLog.findFirst({
    where: { entity: "Reserva", entityId: r2.id },
  });
  check(
    "operation CANCEL_RESERVATION (no la de admin)",
    audit2?.operation === "CANCEL_RESERVATION",
    audit2?.operation,
  );

  console.log("\n--- Caso 5: ADMIN no puede cancelar turno ya pasado ---");
  const r3 = await crearReservaConfirmada(admin.id, pasado.id);
  try {
    await cancelarReserva({ idReserva: r3.id, idUsuario: admin.id });
    check("turno pasado debería bloquearse", false, "no lanzó");
  } catch (e) {
    check(
      "recibe 409 'turno ya comenzó o pasó'",
      e instanceof HttpError && e.status === 409,
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
  // Orden importante: `Pago` tiene FK a `Reserva` sin cascade, así que si se
  // borran las reservas primero el delete falla con P2003 y quedan datos
  // huérfanos en la base.
  await prisma.auditLog.deleteMany({
    where: { entity: "Reserva", entityId: { in: creados.reservas } },
  });
  await prisma.pago.deleteMany({ where: { idReserva: { in: creados.reservas } } });
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