/**
 * Prueba end-to-end del flujo de retorno de Mercado Pago.
 *
 * A diferencia de `pago-vencimiento.js` (que llama a los services directo),
 * este script habla por HTTP contra el backend CORRIENTE en :4000 y después
 * lee la preferencia creada en la API de Mercado Pago. Así verifica lo que
 * importa para el usuario: qué `back_urls` guardó realmente MP y a dónde
 * manda al browser.
 *
 * Cubre:
 *   1. POST /api/payments/preference devuelve 201 y un checkout de Sandbox.
 *   2. La preferencia guardada por MP trae las tres back_urls esperadas.
 *   3. El SPA responde en /pago/exito, /pago/pendiente y /pago/fallo.
 *   4. GET /api/payments/estado responde el estado real cuando el usuario
 *      vuelve SIN pagar (debe dar `sin_pago_en_mp`).
 *
 * ── Sobre los datos de prueba ────────────────────────────────────────────
 * NO crea una Cancha. El backend tiene un job (`generarTurnos`, cada ~6 h y
 * al arrancar) que le genera los 30 días siguientes de turnos a toda cancha
 * `activa`; crear una de prueba dejaba ~420 turnos huérfanos en la base.
 * Reutiliza una cancha activa que ya existe y agrega un único turno a 90
 * días —lejos de la ventana de 30 días del generador, así que no lo toca—.
 * Lo único que crea (usuario, turno, reserva, pago) queda ligado a un turno
 * puntual y se borra por id al final.
 *
 * ── Expectativa de resultado ─────────────────────────────────────────────
 * Con `FRONTEND_URL` en http:// (el caso normal en desarrollo) el Caso 2
 * falla A PROPÓSITO: Mercado Pago descarta las back_urls http:// en silencio,
 * así que es la forma de que la limitación sea visible en vez de quedar
 * escondida detrás de un 201 engañoso. Con un FRONTEND_URL https (producción
 * o túnel) los cuatro casos pasan.
 *
 * Contra la base de desarrollo, corre el backend primero:
 *   node tests/flujo-retorno-mp.js
 */

import bcrypt from "bcrypt";
import { prisma } from "../src/config/prisma.js";

const MARCA = "__test_retorno_mp__";

const BACKEND = process.env.MP_BACKEND_URL || "http://localhost:4000";
const FRONTEND = (process.env.FRONTEND_URL || "http://localhost:5173").replace(
  /\/+$/,
  "",
);
const EMAIL = `user-${MARCA}@test.com`;
const PASSWORD = "Test-RetornoMP-2026";

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

function mostrar(nombre, valor) {
  console.log(`        ${nombre}: ${valor}`);
}

const hora = (h) => new Date(`2026-01-01T${String(h).padStart(2, "0")}:00:00Z`);

/** Fecha de calendario a N días, en UTC a medianoche (igual que `Turno.fecha`). */
function enDias(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function asegurarUsuario() {
  const existente = await prisma.usuario.findUnique({ where: { email: EMAIL } });
  if (existente) return existente;

  const usuario = await prisma.usuario.create({
    data: {
      nombre: "Test",
      apellido: "RetornoMP",
      email: EMAIL,
      contrasena: await bcrypt.hash(PASSWORD, 10),
      rol: "USUARIO",
      activo: true,
      ultimoCambio: "ALTA",
    },
  });
  creados.usuarios.push(usuario.id);
  return usuario;
}

/**
 * Arma el escenario sobre una cancha REAL y activa. Crea un turno a 90 días
 * (fuera de la ventana de 30 días del generador) ya en RESERVADO, más la
 * reserva PENDIENTE con su vencimiento.
 */
async function crearEscenario() {
  const cancha = await prisma.cancha.findFirst({
    where: { activa: true },
  });
  if (!cancha) throw new Error("Necesita al menos una Cancha activa.");

  const usuario = await asegurarUsuario();

  const turno = await prisma.turno.create({
    data: {
      fecha: enDias(90),
      horaInicio: hora(9),
      precio: 1000,
      estado: "RESERVADO",
      idCancha: cancha.id,
    },
  });
  creados.turnos.push(turno.id);

  const reserva = await prisma.reserva.create({
    data: {
      idUsuario: usuario.id,
      idTurno: turno.id,
      estado: "PENDIENTE",
      vencimientoAt: new Date(Date.now() + 180_000),
    },
  });
  creados.reservas.push(reserva.id);

  console.log(`  Escenario: cancha "${cancha.nombre}" (#${cancha.id}), turno #${turno.id} a 90 días`);

  return reserva;
}

async function pedirToken() {
  const r = await fetch(`${BACKEND}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, contrasena: PASSWORD }),
  });
  const cuerpo = await r.json().catch(() => ({}));
  return { status: r.status, token: cuerpo?.token };
}

async function main() {
  console.log(`Backend bajo prueba:  ${BACKEND}`);
  console.log(`Frontend bajo prueba: ${FRONTEND}`);

  const reserva = await crearEscenario();

  console.log("\n--- Caso 1: login y creación de la preferencia ---");
  const { status: statusLogin, token } = await pedirToken();
  check("login devuelve 200", statusLogin === 200, `status ${statusLogin}`);
  if (!token) throw new Error("Sin token: no se puede seguir.");

  const rPref = await fetch(`${BACKEND}/api/payments/preference`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ idReserva: reserva.id }),
  });
  const pref = await rPref.json().catch(() => ({}));
  check(
    "POST /preference devuelve 201",
    rPref.status === 201,
    `status ${rPref.status} ${JSON.stringify(pref)}`,
  );
  check(
    "devuelve un checkoutUrl de MP",
    typeof pref?.checkoutUrl === "string" && /mercadopago\.com\.ar/.test(pref.checkoutUrl),
    pref?.checkoutUrl,
  );
  if (pref?.idPago) creados.pagos.push(pref.idPago);
  mostrar("checkoutUrl", pref?.checkoutUrl ?? "—");
  mostrar("preferenceId", pref?.preferenceId ?? "—");
  mostrar("idPago (external_reference)", pref?.idPago ?? "—");

  console.log("\n--- Caso 2: qué guardó REALMENTE Mercado Pago ---");
  // Se relee la preferencia desde la API de MP: es la única fuente de verdad
  // sobre lo que el browser va a usar, más allá de lo que le pedimos.
  const leida = await fetch(
    `https://api.mercadopago.com/checkout/preferences/${pref.preferenceId}`,
    { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } },
  ).then((r) => r.json());

  const backUrls = leida?.back_urls ?? {};
  mostrar("back_urls.success", JSON.stringify(backUrls.success));
  mostrar("back_urls.pending", JSON.stringify(backUrls.pending));
  mostrar("back_urls.failure", JSON.stringify(backUrls.failure));
  mostrar("auto_return", JSON.stringify(leida?.auto_return));

  // MP exige HTTPS para las back_urls SIEMPRE: con http:// las descarta en
  // silencio (crea la preferencia igual, sin error). Verificado contra la API
  // el 2026-10-21 con http://localhost, http://<host publico> y https://.
  const pistaHttps =
    `MP guardó ${JSON.stringify(backUrls.success)} y se envió ${FRONTEND}/pago/exito. ` +
    `Si salió vacío, FRONTEND_URL es http:// y Mercado Pago descarta las ` +
    `back_urls sin avisar: hace falta una URL HTTPS (túnel) para que el ` +
    `retorno del checkout funcione.`;

  check("MP guardó la back_url de success", backUrls.success === `${FRONTEND}/pago/exito`, pistaHttps);
  check("MP guardó la back_url de pending", backUrls.pending === `${FRONTEND}/pago/pendiente`, pistaHttps);
  check(
    "MP guardó la back_url de failure (/pago/fallo, no /user/mis-reservas)",
    backUrls.failure === `${FRONTEND}/pago/fallo`,
    pistaHttps,
  );
  check(
    "auto_return coincide con el protocolo real de las URLs",
    leida?.auto_return === "approved" ||
      Object.values(backUrls).every((u) => !u.startsWith("https://")),
    `auto_return=${JSON.stringify(leida?.auto_return)}`,
  );

  console.log("\n--- Caso 3: el SPA responde en las tres rutas de retorno ---");
  for (const ruta of ["/pago/exito", "/pago/pendiente", "/pago/fallo"]) {
    const r = await fetch(`${FRONTEND}${ruta}`);
    const html = await r.text();
    check(
      `${ruta} responde 200 con el index del SPA`,
      r.status === 200 && html.includes('id="root"'),
      `status ${r.status}`,
    );
  }

  console.log("\n--- Caso 4: el usuario vuelve SIN pagar ---");
  // Sin `payment_id`, sólo con `external_reference`: es exactamente lo que
  // manda MP cuando el usuario aprieta "Volver a la tienda" sin pagar.
  const rEstado = await fetch(
    `${BACKEND}/api/payments/estado?external_reference=${pref.idPago}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const estado = await rEstado.json().catch(() => ({}));
  check("GET /payments/estado devuelve 200", rEstado.status === 200, JSON.stringify(estado));
  check(
    "el resultado es sin_pago_en_mp",
    estado?.resultado === "sin_pago_en_mp",
    estado?.resultado,
  );
  check(
    "la reserva sigue PENDIENTE",
    estado?.estadoReserva === "PENDIENTE",
    estado?.estadoReserva,
  );
  check(
    "informa cuánto le queda de vencimiento",
    typeof estado?.expiraEnMs === "number" && estado.expiraEnMs > 0,
    String(estado?.expiraEnMs),
  );
  mostrar("estadoPago", estado?.estadoPago ?? "—");
  mostrar("estadoReserva", estado?.estadoReserva ?? "—");

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
  // Por id puntual, nunca por idCancha: el generador de turnos puede haber
  // agregado filas a esa cancha y no son datos de este test.
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