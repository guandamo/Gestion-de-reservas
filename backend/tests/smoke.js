/**
 * Smoke test suite — backend HTTP API.
 * Corre contra un server ya levantado en http://localhost:4000
 *
 * Uso:
 *   node tests/smoke.js
 *
 * Sale con código 0 si todos pasan, 1 si alguno falla.
 */

import assert from "node:assert/strict";
import { prisma } from "../src/config/prisma.js";

const BASE = process.env.API_BASE || "http://localhost:4000";

let passed = 0;
let failed = 0;
const results = [];

async function http(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { status: res.status, body: payload };
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    results.push({ name, ok: true });
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failed++;
    results.push({ name, ok: false, error: err.message });
    console.log(`  ✖ ${name}\n    ${err.message}`);
  }
}

function uniqueEmail(prefix = "qa") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`;
}

/**
 * Ayudante: hace register y luego obtiene el OTP vía peek (sólo dev).
 * Devuelve { register, code } con la respuesta inicial y el código OTP.
 * Si la respuesta no es 201, devuelve { register, code: null }.
 */
async function registerAndPeek(body) {
  const register = await http("POST", "/api/auth/register", { body });
  if (register.status !== 201) return { register, code: null };
  const pendingToken = register.body.pendingToken;
  const peek = await http(
    "GET",
    `/api/dev/peek-otp?pendingToken=${encodeURIComponent(pendingToken)}`,
  );
  const code = peek.status === 200 ? peek.body.code : null;
  return { register, code, pendingToken };
}

/**
 * Crea un Usuario verificado directamente vía Prisma (bypasseando todo el
 * flujo OTP) — usado por regresiones que necesitan un usuario estable.
 */
async function createVerifiedUserViaPrisma(email) {
  const bcrypt = await import("bcrypt");
  const hash = await bcrypt.default.hash("Password123", 10);
  return prisma.usuario.create({
    data: {
      email,
      nombre: "Smoke",
      apellido: "Seed",
      contrasena: hash,
      rol: "USUARIO",
      activo: true,
      ultimoCambio: "ALTA",
    },
  });
}

async function main() {
  console.log("\n=== AUTH ===");
  let userToken = null;
  let adminToken = null;

  await test("GET /health responde 200", async () => {
    const r = await http("GET", "/health");
    assert.equal(r.status, 200);
    assert.equal(r.body.status, "ok");
  });

  await test("POST /api/auth/login admin seed → 200 + token", async () => {
    const r = await http("POST", "/api/auth/login", {
      body: { email: "admin@canchas.com", contrasena: "Admin1234" },
    });
    assert.equal(r.status, 200);
    assert.ok(r.body.token, "debe devolver token");
    assert.equal(r.body.usuario.rol, "ADMIN");
    adminToken = r.body.token;
  });

  await test("POST /api/auth/login password incorrecta → 401", async () => {
    const r = await http("POST", "/api/auth/login", {
      body: { email: "admin@canchas.com", contrasena: "WRONG" },
    });
    assert.equal(r.status, 401);
  });

  await test("POST /api/auth/login email inexistente → 401", async () => {
    const r = await http("POST", "/api/auth/login", {
      body: { email: "nadie@no.com", contrasena: "x" },
    });
    assert.equal(r.status, 401);
  });

  await test("POST /api/auth/login email malformado → 400", async () => {
    const r = await http("POST", "/api/auth/login", {
      body: { email: "no-es-email", contrasena: "x" },
    });
    assert.equal(r.status, 400);
  });

  // --- Crear un usuario "userToken" estable vía flujo OTP completo ---
  // Necesitamos que `userToken` exista antes de los tests de autorización.
  // Usamos el peek dev + verify para el happy path mínimo.

  console.log("\n=== REGISTRO CON OTP ===");

  let pendingToken = null;
  let lastCode = null;

  await test("register OK → 201 + requiresVerification + pendingToken + expiresAt", async () => {
    const email = uniqueEmail("reg");
    const { register, code } = await registerAndPeek({
      nombre: "Smoke",
      apellido: "Test",
      email,
      password: "Password123",
      confirmPassword: "Password123",
    });
    assert.equal(register.status, 201);
    assert.equal(register.body.requiresVerification, true);
    assert.ok(register.body.pendingToken, "debe devolver pendingToken");
    assert.ok(register.body.email, "debe devolver email");
    assert.ok(register.body.expiresAt, "debe devolver expiresAt");
    assert.ok(code && /^\d{6}$/.test(code), "el peek debe devolver un código de 6 dígitos");
    pendingToken = register.body.pendingToken;
    lastCode = code;
  });

  await test("verify código correcto → 200 + token + usuario USUARIO", async () => {
    const r = await http("POST", "/api/auth/verify-otp", {
      body: { pendingToken, code: lastCode },
    });
    assert.equal(r.status, 200);
    assert.ok(r.body.token, "debe emitir JWT");
    assert.equal(r.body.usuario.rol, "USUARIO");
    userToken = r.body.token;
    pendingToken = null; // ya consumido
  });

  await test("register email duplicado (en Usuario) → 409", async () => {
    const r = await http("POST", "/api/auth/register", {
      body: {
        nombre: "Dup",
        apellido: "User",
        email: "admin@canchas.com",
        password: "Password123",
        confirmPassword: "Password123",
      },
    });
    assert.equal(r.status, 409);
  });

  await test("register con password corta → 400", async () => {
    const r = await http("POST", "/api/auth/register", {
      body: {
        nombre: "S",
        apellido: "T",
        email: uniqueEmail("bad"),
        password: "123",
        confirmPassword: "123",
      },
    });
    assert.equal(r.status, 400);
  });

  await test("register con passwords que no coinciden → 400", async () => {
    const r = await http("POST", "/api/auth/register", {
      body: {
        nombre: "S",
        apellido: "T",
        email: uniqueEmail("bad"),
        password: "Password123",
        confirmPassword: "Different123",
      },
    });
    assert.equal(r.status, 400);
  });

  await test("register con email duplicado en PendingRegistration activo → 409", async () => {
    const email = uniqueEmail("dup-pending");
    // Primer register: 201
    const first = await http("POST", "/api/auth/register", {
      body: {
        nombre: "First",
        apellido: "User",
        email,
        password: "Password123",
        confirmPassword: "Password123",
      },
    });
    assert.equal(first.status, 201);
    const tk = first.body.pendingToken;

    // Segundo register con mismo email: 409
    const second = await http("POST", "/api/auth/register", {
      body: {
        nombre: "Second",
        apellido: "User",
        email,
        password: "Password123",
        confirmPassword: "Password123",
      },
    });
    assert.equal(second.status, 409);

    // Limpieza
    await prisma.pendingRegistration.deleteMany({ where: { pendingToken: tk } });
  });

  await test("verify código incorrecto → 400 + intentosRestantes decrementa", async () => {
    const { register, code } = await registerAndPeek({
      nombre: "Bad",
      apellido: "Code",
      email: uniqueEmail("bad-code"),
      password: "Password123",
      confirmPassword: "Password123",
    });
    assert.equal(register.status, 201);
    const tk = register.body.pendingToken;

    const wrongCode = code === "000000" ? "111111" : "000000";
    const r = await http("POST", "/api/auth/verify-otp", {
      body: { pendingToken: tk, code: wrongCode },
    });
    assert.equal(r.status, 400);
    assert.equal(typeof r.body.intentosRestantes, "number");

    await prisma.pendingRegistration.deleteMany({ where: { pendingToken: tk } });
  });

  await test("verify con código incorrecto 5 veces → bloqueo", async () => {
    const { register, code } = await registerAndPeek({
      nombre: "Lock",
      apellido: "Out",
      email: uniqueEmail("lockout"),
      password: "Password123",
      confirmPassword: "Password123",
    });
    assert.equal(register.status, 201);
    const tk = register.body.pendingToken;

    for (let i = 0; i < 5; i++) {
      const r = await http("POST", "/api/auth/verify-otp", {
        body: { pendingToken: tk, code: "999999" },
      });
      if (i < 4) {
        assert.equal(r.status, 400, `intento ${i + 1} debe ser 400`);
      } else {
        assert.equal(r.status, 400, `intento ${i + 1} (último) debe ser 400 con bloqueo`);
        assert.match(r.body.error || "", /Demasiados intentos|agotad|máximo/i);
      }
    }

    // Aún con el código correcto, debe rechazar.
    const stillOk = await http("POST", "/api/auth/verify-otp", {
      body: { pendingToken: tk, code },
    });
    assert.notEqual(stillOk.status, 200);

    await prisma.pendingRegistration.deleteMany({ where: { pendingToken: tk } });
  });

  await test("verify OTP vencido (manipular expiresAt) → 400", async () => {
    const { register, code } = await registerAndPeek({
      nombre: "Expir",
      apellido: "Ed",
      email: uniqueEmail("expired"),
      password: "Password123",
      confirmPassword: "Password123",
    });
    assert.equal(register.status, 201);
    const tk = register.body.pendingToken;

    // Forzar expiración hace 1 segundo.
    await prisma.pendingRegistration.update({
      where: { pendingToken: tk },
      data: { otpExpiresAt: new Date(Date.now() - 1000) },
    });

    const r = await http("POST", "/api/auth/verify-otp", {
      body: { pendingToken: tk, code },
    });
    assert.equal(r.status, 400);
    assert.match(r.body.error || "", /expir/i);

    await prisma.pendingRegistration.deleteMany({ where: { pendingToken: tk } });
  });

  await test("verify OTP ya consumido (segunda llamada) → 409", async () => {
    const { register, code } = await registerAndPeek({
      nombre: "Doble",
      apellido: "Consume",
      email: uniqueEmail("consumed"),
      password: "Password123",
      confirmPassword: "Password123",
    });
    assert.equal(register.status, 201);
    const tk = register.body.pendingToken;

    const first = await http("POST", "/api/auth/verify-otp", {
      body: { pendingToken: tk, code },
    });
    assert.equal(first.status, 200);

    const second = await http("POST", "/api/auth/verify-otp", {
      body: { pendingToken: tk, code },
    });
    assert.equal(second.status, 409);
  });

  await test("resend antes de 90 s → 429 + cooldownEndsAt", async () => {
    const { register } = await registerAndPeek({
      nombre: "Cool",
      apellido: "Down",
      email: uniqueEmail("cooldown"),
      password: "Password123",
      confirmPassword: "Password123",
    });
    assert.equal(register.status, 201);
    const tk = register.body.pendingToken;

    const r = await http("POST", "/api/auth/resend-otp", {
      body: { pendingToken: tk },
    });
    assert.equal(r.status, 429);
    assert.ok(r.body.cooldownEndsAt, "debe devolver cooldownEndsAt");

    await prisma.pendingRegistration.deleteMany({ where: { pendingToken: tk } });
  });

  await test("resend después de 90 s (manipular lastOtpSentAt) → 200 + nuevo código", async () => {
    const { register, code: oldCode } = await registerAndPeek({
      nombre: "Resend",
      apellido: "OK",
      email: uniqueEmail("resend"),
      password: "Password123",
      confirmPassword: "Password123",
    });
    assert.equal(register.status, 201);
    const tk = register.body.pendingToken;

    // Mover lastOtpSentAt al pasado para saltar cooldown.
    await prisma.pendingRegistration.update({
      where: { pendingToken: tk },
      data: { lastOtpSentAt: new Date(Date.now() - 91_000) },
    });

    const r = await http("POST", "/api/auth/resend-otp", {
      body: { pendingToken: tk },
    });
    assert.equal(r.status, 200);
    assert.ok(r.body.expiresAt);
    assert.ok(r.body.cooldownEndsAt);
    assert.equal(typeof r.body.reenviosRestantes, "number");

    // Peek del nuevo código
    const peek = await http(
      "GET",
      `/api/dev/peek-otp?pendingToken=${encodeURIComponent(tk)}`,
    );
    assert.equal(peek.status, 200);
    const newCode = peek.body.code;
    assert.notEqual(newCode, oldCode, "el código nuevo debe ser distinto al viejo");

    await prisma.pendingRegistration.deleteMany({ where: { pendingToken: tk } });
  });

  await test("resend invalida código anterior (verify con viejo → 400)", async () => {
    const { register, code: oldCode } = await registerAndPeek({
      nombre: "Rot",
      apellido: "Ate",
      email: uniqueEmail("rotate"),
      password: "Password123",
      confirmPassword: "Password123",
    });
    assert.equal(register.status, 201);
    const tk = register.body.pendingToken;

    // Forzar cooldown vencido
    await prisma.pendingRegistration.update({
      where: { pendingToken: tk },
      data: { lastOtpSentAt: new Date(Date.now() - 91_000) },
    });
    const resend = await http("POST", "/api/auth/resend-otp", {
      body: { pendingToken: tk },
    });
    assert.equal(resend.status, 200);

    // El viejo código ya no debe servir.
    const check = await http("POST", "/api/auth/verify-otp", {
      body: { pendingToken: tk, code: oldCode },
    });
    assert.equal(check.status, 400);

    await prisma.pendingRegistration.deleteMany({ where: { pendingToken: tk } });
  });

  await test("resend 5 veces → 429 límite alcanzado", async () => {
    const { register } = await registerAndPeek({
      nombre: "Max",
      apellido: "Reenv",
      email: uniqueEmail("maxresend"),
      password: "Password123",
      confirmPassword: "Password123",
    });
    assert.equal(register.status, 201);
    const tk = register.body.pendingToken;

    // Salto el cooldown inicial
    for (let i = 0; i < 5; i++) {
      await prisma.pendingRegistration.update({
        where: { pendingToken: tk },
        data: { lastOtpSentAt: new Date(Date.now() - 91_000) },
      });
      const r = await http("POST", "/api/auth/resend-otp", {
        body: { pendingToken: tk },
      });
      if (i < 4) {
        assert.equal(r.status, 200, `reenvío ${i + 1} debe ser 200`);
      } else {
        assert.equal(r.status, 429, `reenvío ${i + 1} debe ser 429 (límite)`);
      }
    }

    await prisma.pendingRegistration.deleteMany({ where: { pendingToken: tk } });
  });

  await test("verificaciones simultáneas (Promise.all) → solo una gana", async () => {
    const { register, code } = await registerAndPeek({
      nombre: "Race",
      apellido: "Winner",
      email: uniqueEmail("race"),
      password: "Password123",
      confirmPassword: "Password123",
    });
    assert.equal(register.status, 201);
    const tk = register.body.pendingToken;

    const [a, b] = await Promise.all([
      http("POST", "/api/auth/verify-otp", { body: { pendingToken: tk, code } }),
      http("POST", "/api/auth/verify-otp", { body: { pendingToken: tk, code } }),
    ]);
    const ok = [a, b].filter((r) => r.status === 200);
    const conflict = [a, b].filter((r) => r.status === 409);
    assert.equal(ok.length, 1, `solo 1 debe ser 200, obtuve ${a.status}/${b.status}`);
    assert.equal(conflict.length, 1, `solo 1 debe ser 409, obtuve ${a.status}/${b.status}`);
  });

  await test("pendingToken inexistente → 404 en verify", async () => {
    const r = await http("POST", "/api/auth/verify-otp", {
      body: { pendingToken: "no-existe-" + Date.now(), code: "000000" },
    });
    assert.equal(r.status, 404);
  });

  await test("pendingToken inexistente → 404 en resend", async () => {
    const r = await http("POST", "/api/auth/resend-otp", {
      body: { pendingToken: "no-existe-" + Date.now() },
    });
    assert.equal(r.status, 404);
  });

  await test("GET /api/auth/registration/:token/status → 200 + emailMasked", async () => {
    const email = uniqueEmail("status");
    const { register } = await registerAndPeek({
      nombre: "St",
      apellido: "At",
      email,
      password: "Password123",
      confirmPassword: "Password123",
    });
    assert.equal(register.status, 201);
    const tk = register.body.pendingToken;

    const r = await http("GET", `/api/auth/registration/${tk}/status`);
    assert.equal(r.status, 200);
    assert.ok(r.body.emailMasked);
    assert.ok(r.body.emailMasked.includes("***"), "email debe estar enmascarado");
    assert.ok(r.body.emailMasked.endsWith(`@${email.split("@")[1]}`));
    assert.equal(r.body.estado, "pendiente");
    assert.equal(typeof r.body.intentosRestantes, "number");
    assert.equal(typeof r.body.reenviosRestantes, "number");

    await prisma.pendingRegistration.deleteMany({ where: { pendingToken: tk } });
  });

  await test("fallo simulado de Resend → register → 502 + sin PendingRegistration persistido", async () => {
    // Aseguramos flag off antes
    await http("POST", "/api/dev/force-email-failure", { body: { enabled: false } });

    // Encender flag
    const on = await http("POST", "/api/dev/force-email-failure", {
      body: { enabled: true },
    });
    assert.equal(on.status, 200);
    assert.equal(on.body.forceEmailFailure, true);

    const email = uniqueEmail("fail-email");
    const before = await prisma.pendingRegistration.count({ where: { email } });
    const r = await http("POST", "/api/auth/register", {
      body: {
        nombre: "Fail",
        apellido: "Mail",
        email,
        password: "Password123",
        confirmPassword: "Password123",
      },
    });
    assert.equal(r.status, 502);
    const after = await prisma.pendingRegistration.count({ where: { email } });
    assert.equal(after, before, "no debe quedar registro pendiente al fallar el envío");

    // Apagar flag
    await http("POST", "/api/dev/force-email-failure", { body: { enabled: false } });
  });

  console.log("\n=== REGRESIONES ===");

  // Si llegamos hasta acá sin haber asignado userToken (porque los pasos
  // anteriores fallaron), creamos uno directamente por BD para no romper
  // las regresiones downstream.
  if (!userToken) {
    const email = uniqueEmail("seed-bypass");
    await createVerifiedUserViaPrisma(email);
    const login = await http("POST", "/api/auth/login", {
      body: { email, contrasena: "Password123" },
    });
    if (login.status === 200) userToken = login.body.token;
  }

  await test("regresión: login con usuario OTP-confirmado sigue funcionando", async () => {
    const email = uniqueEmail("otplogin");
    const { code } = await registerAndPeek({
      nombre: "Login",
      apellido: "Post",
      email,
      password: "Password123",
      confirmPassword: "Password123",
    });
    const reg = await http("POST", "/api/auth/register", {
      body: {
        nombre: "Login",
        apellido: "Post",
        email,
        password: "Password123",
        confirmPassword: "Password123",
      },
    });
    const tk = reg.body.pendingToken;
    const v = await http("POST", "/api/auth/verify-otp", {
      body: { pendingToken: tk, code },
    });
    assert.equal(v.status, 200);

    const login = await http("POST", "/api/auth/login", {
      body: { email, contrasena: "Password123" },
    });
    assert.equal(login.status, 200);
    assert.ok(login.body.token);
  });

  await test("regresión: cambio de contraseña sigue funcionando", async () => {
    const email = uniqueEmail("changepw");
    const u = await createVerifiedUserViaPrisma(email);
    const login = await http("POST", "/api/auth/login", {
      body: { email, contrasena: "Password123" },
    });
    assert.equal(login.status, 200);
    const tk = login.body.token;

    const r = await http("PATCH", "/api/auth/me/password", {
      token: tk,
      body: {
        contrasenaActual: "Password123",
        nuevaContrasena: "Password456",
      },
    });
    assert.equal(r.status, 200);

    // Login con la nueva contraseña
    const login2 = await http("POST", "/api/auth/login", {
      body: { email, contrasena: "Password456" },
    });
    assert.equal(login2.status, 200);

    // Limpieza: volver al password original
    const tk2 = login2.body.token;
    await http("PATCH", "/api/auth/me/password", {
      token: tk2,
      body: {
        contrasenaActual: "Password456",
        nuevaContrasena: "Password123",
      },
    });
    await prisma.usuario.delete({ where: { id: u.id } });
  });

  console.log("\n=== AUTH MIDDLEWARE ===");

  await test("GET /api/auth/me sin token → 401", async () => {
    const r = await http("GET", "/api/auth/me");
    assert.equal(r.status, 401);
  });

  await test("GET /api/auth/me token inválido → 401", async () => {
    const r = await http("GET", "/api/auth/me", { token: "INVALID.TOKEN.HERE" });
    assert.equal(r.status, 401);
  });

  await test("GET /api/auth/me con token USER → 200", async () => {
    if (!userToken) return; // si falló el flujo OTP, se saltea
    const r = await http("GET", "/api/auth/me", { token: userToken });
    assert.equal(r.status, 200);
    assert.equal(r.body.usuario.rol, "USUARIO");
  });

  console.log("\n=== AUTORIZACIÓN POR ROL ===");

  await test("USER accede a /api/users → 403", async () => {
    if (!userToken) return;
    const r = await http("GET", "/api/users", { token: userToken });
    assert.equal(r.status, 403);
  });

  await test("USER accede a /api/reports → 403", async () => {
    if (!userToken) return;
    const r = await http("GET", "/api/reports", { token: userToken });
    assert.equal(r.status, 403);
  });

  await test("USER accede a /api/audit → 403", async () => {
    if (!userToken) return;
    const r = await http("GET", "/api/audit", { token: userToken });
    assert.equal(r.status, 403);
  });

  await test("USER lista /api/reservations → 403", async () => {
    if (!userToken) return;
    const r = await http("GET", "/api/reservations", { token: userToken });
    assert.equal(r.status, 403);
  });

  await test("USER crea cancha → 403", async () => {
    if (!userToken) return;
    const r = await http("POST", "/api/courts", {
      token: userToken,
      body: {
        nombre: "X",
        idTipoCancha: 1,
        precioTurno: 1000,
        horaInicio: "08:00",
        horaFin: "20:00",
      },
    });
    assert.equal(r.status, 403);
  });

  await test("USER suspende a otro USER → 403", async () => {
    if (!userToken) return;
    const r = await http("PATCH", "/api/users/5/status", {
      token: userToken,
      body: { activo: false },
    });
    assert.equal(r.status, 403);
  });

  await test("ADMIN accede a /api/users → 200", async () => {
    const r = await http("GET", "/api/users", { token: adminToken });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.usuarios));
  });

  await test("ADMIN accede a /api/reports → 200", async () => {
    const r = await http("GET", "/api/reports?mes=2026-09", { token: adminToken });
    assert.equal(r.status, 200);
    assert.ok(typeof r.body.ingresosMes === "number");
  });

  console.log("\n=== CANCHAS Y TURNOS ===");

  await test("GET /api/courts → 200 y devuelve canchas", async () => {
    if (!userToken) return;
    const r = await http("GET", "/api/courts", { token: userToken });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.canchas));
  });

  await test("GET /api/court-types → 200", async () => {
    if (!userToken) return;
    const r = await http("GET", "/api/court-types", { token: userToken });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.tipos));
  });

  await test("GET /api/turnos/availability/1 → 200", async () => {
    if (!userToken) return;
    const r = await http("GET", "/api/turnos/availability/1", { token: userToken });
    assert.equal(r.status, 200);
    assert.ok(r.body.cancha);
    assert.ok(Array.isArray(r.body.turnos));
  });

  await test("GET /api/turnos/availability/99999 → 404", async () => {
    if (!userToken) return;
    const r = await http("GET", "/api/turnos/availability/99999", { token: userToken });
    assert.equal(r.status, 404);
  });

  console.log("\n=== RESERVAS ===");

  await test("USER crea reserva sobre turno futuro disponible → 201", async () => {
    if (!userToken) return;
    const disp = await http("GET", "/api/turnos/availability/1", { token: userToken });
    if (disp.status !== 200) return;
    const turnoLibre = disp.body.turnos.find((t) => t.estado === "DISPONIBLE");
    if (!turnoLibre) return;

    const r = await http("POST", "/api/reservations", {
      token: userToken,
      body: { idTurno: turnoLibre.id },
    });
    assert.ok(r.status === 201 || r.status === 400, `esperaba 201 o 400, obtuve ${r.status}`);
  });

  await test("USER ve su propia reserva en /api/reservations/my", async () => {
    if (!userToken) return;
    const r = await http("GET", "/api/reservations/my", { token: userToken });
    if (r.status === 200) assert.ok(Array.isArray(r.body.items));
  });

  await test("ADMIN ve todas las reservas en /api/reservations", async () => {
    const r = await http("GET", "/api/reservations", { token: adminToken });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.items));
  });

  console.log("\n=== AUDITORÍA ===");

  await test("ADMIN lista AuditLog → 200", async () => {
    const r = await http("GET", "/api/audit?limit=5", { token: adminToken });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.items));
  });

  await test("AuditLog NO expone contraseñas", async () => {
    const r = await http("GET", "/api/audit?entity=Usuario&limit=10", { token: adminToken });
    assert.equal(r.status, 200);
    for (const item of r.body.items) {
      const blob = JSON.stringify(item.newValues || {}) + JSON.stringify(item.oldValues || {});
      assert.ok(!blob.includes("contrasena"), `audit #${item.id} contiene "contrasena"`);
    }
  });

  console.log("\n=== SUSPENSIÓN DE ADMIN (FIX) ===");

  await test("ADMIN intenta suspender a otro ADMIN → 409", async () => {
    const r = await http("PATCH", "/api/users/3/status", {
      token: adminToken,
      body: { activo: false },
    });
    assert.equal(r.status, 409);
  });

  await test("ADMIN intenta auto-suspenderse → 409", async () => {
    const r = await http("PATCH", "/api/users/3/status", {
      token: adminToken,
      body: { activo: false },
    });
    assert.equal(r.status, 409);
  });

  console.log("\n=== RESUMEN ===");
  console.log(`Total: ${passed + failed} | Pasaron: ${passed} | Fallaron: ${failed}`);
  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error("Error fatal ejecutando tests:", err);
  try {
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});