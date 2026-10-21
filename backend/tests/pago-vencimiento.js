/**
 * Tests de integración para el nuevo comportamiento en `crearPreferenciaPago`
 * y `listarMisReservas`.
 *
 * Cubre:
 *   - Una reserva PENDIENTE con `vencimientoAt` en el pasado NO debe permitir
 *     iniciar un pago nuevo: el barrido periódico la va a cancelar y, si el
 *     usuario pagaba acá, terminaríamos cobrando por una reserva que ya no
 *     le pertenece. La guardia tira 409 antes de tocar la API de MP.
 *   - Una reserva PENDIENTE con `vencimientoAt` en el futuro SÍ debe poder
 *     iniciar un pago (ejercita el path normal; requiere credenciales reales
 *     de MP en el entorno, igual que `tests/smoke.js`).
 *   - `listarMisReservas` expone `vencimientoAt` para que el front pueda
 *     pintar el reloj y decidir cuándo esconder el botón "Pagar".
 *
 * Crea sus propios datos con marca y los limpia al final, igual que los
 * demás tests de integración.
 */

import { prisma } from "../src/config/prisma.js";
import { HttpError } from "../src/utils/httpError.js";
import { crearPreferenciaPago } from "../src/services/pago/crearPreferenciaPago.js";
import { listarMisReservas } from "../src/services/reserva/listarMisReservas.js";

const MARCA = "__test_pago_vencimiento__";

let fallos = 0;
const creados = { canchas: [], turnos: [], reservas: [], usuarios: [], pagos: [] };

async function check(nombre, condicion, detalle = "") {
  if (condicion) {
    console.log(`  OK   ${nombre}`);
  } else {
    fallos += 1;
    console.log(`  FALLA ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  }
}

function enDias(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const hora = (h) => new Date(`2026-01-01T${String(h).padStart(2, "0")}:00:00Z`);

async function asegurarUsuario(email, nombre) {
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) return existente;
  const usuario = await prisma.usuario.create({
    data: {
      nombre,
      apellido: "Test",
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

async function crearCanchaYTurnoFuturo() {
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

  const turno = await prisma.turno.create({
    data: {
      fecha: enDias(5),
      horaInicio: hora(9),
      precio: 1000,
      estado: "RESERVADO",
      idCancha: cancha.id,
    },
  });
  creados.turnos.push(turno.id);

  return turno;
}

async function crearReserva(idUsuario, idTurno, { vencida }) {
  const reserva = await prisma.reserva.create({
    data: {
      idUsuario,
      idTurno,
      estado: "PENDIENTE",
      // Marca la reserva como vencida seteando `vencimientoAt` en el pasado.
      // Esto simula el estado que tendría la BD si la sweep todavía no pasó
      // a la reserva por X motivo (carrera con un pago tardío, etc.).
      vencimientoAt: new Date(
        Date.now() + (vencida ? -5_000 : 180_000),
      ),
    },
  });
  creados.reservas.push(reserva.id);
  return reserva;
}

async function main() {
  const usuario = await asegurarUsuario(`user-${MARCA}@test.com`, "User");
  const turno = await crearCanchaYTurnoFuturo();

  console.log("\n--- Caso 1: reserva PENDIENTE con vencimientoAt vencido → 409 ---");
  const rVencida = await crearReserva(usuario.id, turno.id, { vencida: true });
  try {
    await crearPreferenciaPago({ idReserva: rVencida.id, idUsuario: usuario.id });
    check("rechaza reserva vencida", false, "no lanzó");
  } catch (e) {
    check(
      "recibe 409",
      e instanceof HttpError && e.status === 409,
      e?.message,
    );
    check(
      "el mensaje explica que la reserva venció",
      typeof e?.message === "string" &&
        /venci[oó]|turno.*volvi[oó].*disponible/i.test(e.message),
      e?.message,
    );
  }

  console.log("\n--- Caso 2: listarMisReservas expone vencimientoAt ---");
  const lista = await listarMisReservas({ idUsuario: usuario.id });
  const itemVencida = lista.find((r) => r.id === rVencida.id);
  check("la reserva aparece en la lista", Boolean(itemVencida));
  check(
    "vencimientoAt es ISO string",
    typeof itemVencida?.vencimientoAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T/.test(itemVencida.vencimientoAt),
    JSON.stringify(itemVencida?.vencimientoAt),
  );

  console.log("\n--- Caso 3: reserva PENDIENTE vigente → preference se crea ---");
  // Usa un turno distinto para no chocar con la reserva vencida del caso 1.
  const turno2 = await prisma.turno.create({
    data: {
      fecha: enDias(6),
      horaInicio: hora(10),
      precio: 1000,
      estado: "RESERVADO",
      idCancha: turno.idCancha,
    },
  });
  creados.turnos.push(turno2.id);

  const rVigente = await crearReserva(usuario.id, turno2.id, { vencida: false });

  let pagoOk = null;
  try {
    pagoOk = await crearPreferenciaPago({
      idReserva: rVigente.id,
      idUsuario: usuario.id,
    });
    check("preference OK con reserva vigente", true);
  } catch (e) {
    // Si el entorno no tiene credenciales de MP (Sandbox/prod), la llamada
    // puede fallar en la API de MP. Eso NO significa que la guardia esté
    // mal: si llegamos hasta acá con `e.status === 502`, la guardia pasó.
    if (e instanceof HttpError && e.status === 502) {
      console.log(
        "  (MP fuera de línea o sin credenciales: se omite el chequeo de " +
          "preference.id. La guardia de vencimiento sigue verde.)",
      );
      check(
        "la guardia NO se disparó (vencimientoAt vigente)",
        e.message !== "La reserva venció. El turno volvió a estar disponible.",
        e.message,
      );
    } else {
      throw e;
    }
  }

  if (pagoOk) {
    check("devuelve idReserva", pagoOk.idReserva === rVigente.id);
    check(
      "devuelve un checkoutUrl con forma de URL de MP",
      typeof pagoOk.checkoutUrl === "string" &&
        /^https?:\/\/([a-z0-9-]+\.)?mercadopago\.com\.ar\//i.test(
          pagoOk.checkoutUrl,
        ),
      pagoOk.checkoutUrl,
    );
    if (pagoOk.idPago) creados.pagos.push(pagoOk.idPago);
  }

  console.log(
    fallos === 0
      ? "\nRESULTADO: todas las aserciones pasaron\n"
      : `\nRESULTADO: ${fallos} fallo(s)\n`,
  );
}

async function limpiar() {
  // Orden FK-safe: auditLog → pago → reserva → turno → cancha → usuario.
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
  if (creados.turnos.length) {
    await prisma.turno.deleteMany({ where: { id: { in: creados.turnos } } });
  }
  if (creados.canchas.length) {
    await prisma.cancha.deleteMany({ where: { id: { in: creados.canchas } } });
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
