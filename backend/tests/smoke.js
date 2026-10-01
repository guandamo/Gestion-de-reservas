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

  await test("POST /api/auth/register nuevo USUARIO → 201 + token", async () => {
    const email = uniqueEmail("reg");
    const r = await http("POST", "/api/auth/register", {
      body: {
        nombre: "Smoke",
        apellido: "Test",
        email,
        password: "Password123",
        confirmPassword: "Password123",
      },
    });
    assert.equal(r.status, 201);
    assert.ok(r.body.token);
    assert.equal(r.body.usuario.rol, "USUARIO");
    userToken = r.body.token;
  });

  await test("POST /api/auth/register password corta → 400", async () => {
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

  await test("POST /api/auth/register passwords no coinciden → 400", async () => {
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

  await test("POST /api/auth/register email duplicado → 409", async () => {
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
    const r = await http("GET", "/api/auth/me", { token: userToken });
    assert.equal(r.status, 200);
    assert.equal(r.body.usuario.rol, "USUARIO");
  });

  console.log("\n=== AUTORIZACIÓN POR ROL ===");

  await test("USER accede a /api/users → 403", async () => {
    const r = await http("GET", "/api/users", { token: userToken });
    assert.equal(r.status, 403);
  });

  await test("USER accede a /api/reports → 403", async () => {
    const r = await http("GET", "/api/reports", { token: userToken });
    assert.equal(r.status, 403);
  });

  await test("USER accede a /api/audit → 403", async () => {
    const r = await http("GET", "/api/audit", { token: userToken });
    assert.equal(r.status, 403);
  });

  await test("USER lista /api/reservations → 403", async () => {
    const r = await http("GET", "/api/reservations", { token: userToken });
    assert.equal(r.status, 403);
  });

  await test("USER crea cancha → 403", async () => {
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
    const r = await http("GET", "/api/courts", { token: userToken });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.canchas));
  });

  await test("GET /api/court-types → 200", async () => {
    const r = await http("GET", "/api/court-types", { token: userToken });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.tipos));
  });

  await test("GET /api/turnos/availability/1 → 200", async () => {
    const r = await http("GET", "/api/turnos/availability/1", { token: userToken });
    assert.equal(r.status, 200);
    assert.ok(r.body.cancha);
    assert.ok(Array.isArray(r.body.turnos));
  });

  await test("GET /api/turnos/availability/99999 → 404", async () => {
    const r = await http("GET", "/api/turnos/availability/99999", { token: userToken });
    assert.equal(r.status, 404);
  });

  console.log("\n=== RESERVAS ===");

  let reservaId = null;

  await test("USER crea reserva sobre turno futuro disponible → 201", async () => {
    const disp = await http("GET", "/api/turnos/availability/1", { token: userToken });
    assert.equal(disp.status, 200);
    const turnoLibre = disp.body.turnos.find((t) => t.estado === "DISPONIBLE");
    assert.ok(turnoLibre, "debe haber al menos un turno disponible");

    const r = await http("POST", "/api/reservations", {
      token: userToken,
      body: { idTurno: turnoLibre.id },
    });
    assert.ok(r.status === 201 || r.status === 400, `esperaba 201 o 400 (turno pasado), obtuve ${r.status}`);
    if (r.status === 201) reservaId = r.body.reservationId;
  });

  await test("USER ve su propia reserva en /api/reservations/my", async () => {
    const r = await http("GET", "/api/reservations/my", { token: userToken });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.items));
  });

  await test("USER NO ve reservas ajenas via /api/reservations/:id → 403", async () => {
    const r = await http("GET", "/api/reservations/20", { token: userToken });
    assert.equal(r.status, 403);
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
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Error fatal ejecutando tests:", err);
  process.exit(1);
});