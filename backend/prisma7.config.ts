// Configuración de Prisma para este proyecto.
// Usa DATABASE_URL por defecto; cae en DIRECT_URL si la primera no existe.

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    url: process.env["DATABASE_URL"] ?? process.env["DIRECT_URL"],
  },
});
