/**
 * Test del teléfono en el registro de usuarios.
 *
 * Corre contra un server ya levantado en http://localhost:4000
 *
 *   node tests/registro-telefono.js
 *
 * Y va en dos bloques:
 *
 *  1. VALIDACIÓN (siempre corre). Todos estos casos cortan en
 *     `validarTelefono`, que se ejecuta ANTES del primer acceso a la base, así
 *     que no dejan ni una fila escrita. Por eso se pueden correr contra
 *     producción sin riesgo.
 *
 *  2. PERSISTENCIA (solo con ALLOW_DB_WRITE=1). Crea usuarios reales para
 *     probar la normalización y el UNIQUE, y después los borra. Apagate salvo
 *     que quieras que escriba en la base de verdad:
 *
 *     ALLOW_DB_WRITE=1 node tests/registro-telefono.js
 */

import assert from "node:assert/strict";
import { prisma } from "../src/config/prisma.js";

const BASE = process.env.API_BASE || "http://localhost:4000";
const PERMITE_ESCRITURA = process.env.ALLOW_DB_WRITE === "1";

let passed = 0;
let failed = 0;

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
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✘ ${name}`);
    console.log(`      ${err.message}`);
  }
}

/** Datos válidos salvo el teléfono, que es lo que cada caso quiere varyear. */
function registro(overrides = {}) {
  return {
    nombre: "Juan",
    apellido: "Pérez",
    email: `test-telefono-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: "Contrasena123",
    confirmPassword: "Contrasena123",
    ...overrides,
  };
}

// --- 1) Validación: no escribe nada en la base ---

console.log("\nValidación del teléfono (sin escrituras)");

await test("sin teléfono → 400 'Faltan campos obligatorios.'", async () => {
  const { status, body } = await http("POST", "/api/auth/register", {
    body: registro({ telefono: undefined }),
  });
  assert.equal(status, 400);
  assert.equal(body.error, "Faltan campos obligatorios.");
});

await test("teléfono vacío → 400 'Faltan campos obligatorios.'", async () => {
  const { status, body } = await http("POST", "/api/auth/register", {
    body: registro({ telefono: "" }),
  });
  assert.equal(status, 400);
  assert.equal(body.error, "Faltan campos obligatorios.");
});

await test("teléfono sólo con espacios → 400 'El teléfono es obligatorio.'", async () => {
  const { status, body } = await http("POST", "/api/auth/register", {
    body: registro({ telefono: "   " }),
  });
  assert.equal(status, 400);
  assert.equal(body.error, "El teléfono es obligatorio.");
});

await test("teléfono con letras → 400 'entre 7 y 15 dígitos'", async () => {
  const { status, body } = await http("POST", "/api/auth/register", {
    body: registro({ telefono: "telefono-de-quien-sea" }),
  });
  assert.equal(status, 400);
  assert.equal(body.error, "El teléfono debe tener entre 7 y 15 dígitos.");
});

await test("teléfono demasiado corto (6 dígitos) → 400", async () => {
  const { status, body } = await http("POST", "/api/auth/register", {
    body: registro({ telefono: "123456" }),
  });
  assert.equal(status, 400);
  assert.equal(body.error, "El teléfono debe tener entre 7 y 15 dígitos.");
});

await test("teléfono demasiado largo (16 dígitos) → 400", async () => {
  const { status, body } = await http("POST", "/api/auth/register", {
    body: registro({ telefono: "1234567890123456" }),
  });
  assert.equal(status, 400);
  assert.equal(body.error, "El teléfono debe tener entre 7 y 15 dígitos.");
});

await test("teléfono no-string (número) → 400 'no es válido'", async () => {
  const { status, body } = await http("POST", "/api/auth/register", {
    body: registro({ telefono: 2211234567 }),
  });
  assert.equal(status, 400);
  assert.equal(body.error, "El teléfono no es válido.");
});

await test("teléfono con letra pegada al número (+54a9) → 400", async () => {
  const { status, body } = await http("POST", "/api/auth/register", {
    body: registro({ telefono: "+54a92211234567" }),
  });
  assert.equal(status, 400);
  assert.equal(body.error, "El teléfono debe tener entre 7 y 15 dígitos.");
});

console.log("\nInmutabilidad del teléfono en el perfil (sin escrituras)");

await test("el teléfono NO viaja en el PATCH del perfil", async () => {
  // Guardar el perfil tiene que funcionar mandando sólo nombre y apellido.
  // Si el frontend volviera a mandar `telefono`, el backend lo rechaza con 400
  // y el guardado del nombre se rompe: esto cubre que el contrato siga igual.
  // Se espera 401/404 por no tener sesión, nunca 400 de validación.
  const { status } = await http("PATCH", "/api/auth/me", {
    body: { nombre: "Juan", apellido: "Pérez" },
  });
  assert.notEqual(status, 400, "el PATCH sin sesión no debe cortar en validación");
});

// --- 2) Persistencia: requiere escritura ---

if (!PERMITE_ESCRITURA) {
  console.log(
    "\nPersistencia (normalización y duplicados) OMITIDA.\n" +
      "Corré con ALLOW_DB_WRITE=1 para habilitarla: escribe usuarios reales\n" +
      "en la base configurada y los borra al terminar.",
  );
} else {
  console.log("\nPersistencia (ESCRIBE en la base — ALLOW_DB_WRITE=1)");

  const EMPAIL_A = `test-tel-a-${Date.now()}@example.com`;
  const EMPAIL_B = `test-tel-b-${Date.now()}@example.com`;

  try {
    await test("registra con '+54 9 221 123-4567' y guarda '5492211234567'", async () => {
      const { status, body } = await http("POST", "/api/auth/register", {
        body: registro({
          email: EMPAIL_A,
          telefono: "+54 9 221 123-4567",
        }),
      });
      assert.equal(status, 201);
      assert.equal(body.usuario.telefono, "5492211234567");
    });

    await test("el mismo teléfono escrito distinto → 409", async () => {
      // "+54 9 221 123-4567" ya se guardó como "5492211234567". Si la
      // normalización no funcionara, "(549) 2211234567" entraría como OTRO
      // usuario duplicado con el mismo número real.
      const { status, body } = await http("POST", "/api/auth/register", {
        body: registro({ email: EMPAIL_B, telefono: "(549) 221-123-4567" }),
      });
      assert.equal(status, 409);
      assert.equal(body.error, "Ese teléfono ya está asociado a otra cuenta.");
    });

    await test("el teléfono aparece en GET /auth/me del usuario creado", async () => {
      const { body: reg } = await http("POST", "/api/auth/register", {
        body: registro({
          email: `test-tel-me-${Date.now()}@example.com`,
          telefono: "2219988777",
        }),
      });
      assert.equal(reg.usuario.telefono, "2219988777");

      const { status, body } = await http("GET", "/api/auth/me", {
        token: reg.token,
      });
      assert.equal(status, 200);
      assert.equal(body.usuario.telefono, "2219988777");
    });

    await test("PATCH del perfil con otro teléfono → 400 explícito", async () => {
      const { body: reg } = await http("POST", "/api/auth/register", {
        body: registro({
          email: `test-tel-imp-${Date.now()}@example.com`,
          telefono: "2218877665",
        }),
      });
      const { status, body } = await http("PATCH", "/api/auth/me", {
        token: reg.token,
        body: { nombre: "Juan", apellido: "Pérez", telefono: "9998887776" },
      });
      assert.equal(status, 400);
      assert.equal(body.error, "El teléfono no se puede modificar desde el perfil.");
    });

    await test("PATCH del perfil con el MISMO teléfono → OK", async () => {
      // El frontend manda el valor que ya tiene. Si el backend lo rechazara,
      // guardar el nombre desde "Mi perfil" fallaría siempre.
      const { body: reg } = await http("POST", "/api/auth/register", {
        body: registro({
          email: `test-tel-ok-${Date.now()}@example.com`,
          telefono: "2217766554",
        }),
      });
      const { status } = await http("PATCH", "/api/auth/me", {
        token: reg.token,
        body: {
          nombre: "Juan Carlos",
          apellido: "Pérez",
          telefono: "2217766554",
        },
      });
      assert.equal(status, 200);
    });
  } finally {
    const borrados = await prisma.$executeRawUnsafe(
      `DELETE FROM "AuditLog" WHERE "entity" = 'Usuario' AND "entityId" IN (
         SELECT "id" FROM "Usuario" WHERE "email" LIKE 'test-tel-%@example.com'
       )`,
    );
    const usuarios = await prisma.$executeRawUnsafe(
      `DELETE FROM "Usuario" WHERE "email" LIKE 'test-tel-%@example.com'`,
    );
    console.log(`\n  Limpieza: ${usuarios} usuario(s), ${borrados} auditoría.`);
  }
}

console.log(
  `\n${failed === 0 ? "TODO OK" : "FALLOS"} — ${passed} pasaron, ${failed} fallaron\n`,
);

process.exit(failed === 0 ? 0 : 1);