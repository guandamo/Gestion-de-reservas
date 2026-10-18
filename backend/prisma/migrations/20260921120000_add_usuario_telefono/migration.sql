-- La migración inicial ya crea telefono en bases nuevas. En instalaciones
-- existentes donde la columna falte, la agregamos sin afectar a las demás.
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "telefono" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_telefono_key" ON "Usuario"("telefono");
