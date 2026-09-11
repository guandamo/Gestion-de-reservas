import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../src/config/prisma.js";

/**
 * Seed idempotente.
 * - Crea un ADMIN inicial si no existe ya.
 */
async function main() {
  const adminEmail = "admin@canchas.com";
  const existe = await prisma.usuario.findUnique({ where: { email: adminEmail } });
  if (existe) {
    console.log(`✔ Ya existe el usuario admin: ${adminEmail} (id=${existe.id})`);
    return;
  }

  const contrasenaHash = await bcrypt.hash("Admin1234", 10);

  const admin = await prisma.usuario.create({
    data: {
      nombre: "Admin",
      apellido: "Principal",
      email: adminEmail,
      contrasena: contrasenaHash,
      telefono: "+5491100000000",
      rol: "ADMIN",
      ultimoCambio: "ALTA",
    },
  });

  console.log(`✔ Admin creado: ${adminEmail} (id=${admin.id})`);
  console.log("  Podés iniciar sesión con la contraseña: Admin1234");
}

main()
  .catch((e) => {
    console.error("✖ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
