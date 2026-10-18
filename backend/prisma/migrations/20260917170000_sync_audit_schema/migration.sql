-- Sincronización del esquema de auditoría (nivel 1 y nivel 2).
-- Todas las operaciones son idempotentes (IF NOT EXISTS / DO $$).

-- ============================================================
-- TipoCancha: columnas de auditoría nivel 1
-- ============================================================
ALTER TABLE "TipoCancha"
    ADD COLUMN IF NOT EXISTS "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "modifiedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "operacion"     TEXT,
    ADD COLUMN IF NOT EXISTS "modificadoPor" INTEGER;

-- ============================================================
-- Cancha: columnas de auditoría nivel 1
-- ============================================================
ALTER TABLE "Cancha"
    ADD COLUMN IF NOT EXISTS "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "modifiedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "operacion"     TEXT,
    ADD COLUMN IF NOT EXISTS "modificadoPor" INTEGER;

CREATE INDEX IF NOT EXISTS "Cancha_modificadoPor_idx" ON "Cancha"("modificadoPor");

-- ============================================================
-- Usuario: columnas de auditoría nivel 1 (auto-referencial)
-- ============================================================
ALTER TABLE "Usuario"
    ADD COLUMN IF NOT EXISTS "modificadoPor" INTEGER;

CREATE INDEX IF NOT EXISTS "Usuario_modificadoPor_idx" ON "Usuario"("modificadoPor");

-- ============================================================
-- FK: TipoCancha.modificadoPor -> Usuario (idempotente)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'TipoCancha_modificadoPor_fkey'
  ) THEN
    ALTER TABLE "TipoCancha"
      ADD CONSTRAINT "TipoCancha_modificadoPor_fkey"
      FOREIGN KEY ("modificadoPor") REFERENCES "Usuario"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- FK: Cancha.modificadoPor -> Usuario (idempotente)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Cancha_modificadoPor_fkey'
  ) THEN
    ALTER TABLE "Cancha"
      ADD CONSTRAINT "Cancha_modificadoPor_fkey"
      FOREIGN KEY ("modificadoPor") REFERENCES "Usuario"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- FK: Usuario.modificadoPor -> Usuario (auto-referencial, idempotente)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Usuario_modificadoPor_fkey'
  ) THEN
    ALTER TABLE "Usuario"
      ADD CONSTRAINT "Usuario_modificadoPor_fkey"
      FOREIGN KEY ("modificadoPor") REFERENCES "Usuario"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- AuditLog: historial global (nivel 2)
-- ============================================================
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id"          SERIAL        NOT NULL,
    "entity"      TEXT          NOT NULL,
    "entityId"    INTEGER       NOT NULL,
    "operation"   TEXT          NOT NULL,
    "performedBy" INTEGER,
    "performedAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldValues"   JSONB,
    "newValues"   JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx"  ON "AuditLog"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_performedBy_idx"      ON "AuditLog"("performedBy");
CREATE INDEX IF NOT EXISTS "AuditLog_performedAt_idx"      ON "AuditLog"("performedAt");

-- FK: AuditLog.performedBy -> Usuario (idempotente)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'AuditLog_performedBy_fkey'
  ) THEN
    ALTER TABLE "AuditLog"
      ADD CONSTRAINT "AuditLog_performedBy_fkey"
      FOREIGN KEY ("performedBy") REFERENCES "Usuario"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
