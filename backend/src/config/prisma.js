import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";

const { PrismaClient } = pkg;

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,

  // La base no es local: está detrás del pooler de Supabase y se accede por
  // internet. Abrir una conexión nueva (TCP + TLS + handshake con el pooler)
  // puede tardar bastante más de los 2 s que Prisma espera por defecto para
  // adquirir una conexión de transacción; cuando eso pasa la transacción falla
  // con P2028 y el errorHandler la traduce a un 500 "Error interno del
  // servidor", aunque la operación sea perfectamente válida. Los defaults son
  // maxWait 2 s y timeout 5 s.
  transactionOptions: {
    maxWait: 10_000,
    timeout: 20_000,
  },
});

export { prisma };