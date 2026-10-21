-- Pasa las columnas que guardan INSTANTES de `timestamp without time zone` a
-- `timestamp with time zone`.
--
-- Por qué pasa esto
-- ----------------
-- Prisma usa `timestamp without time zone` como tipo por defecto de DateTime.
-- La sesión de Postgres de Supabase está en `TimeZone = UTC`, así que
-- `CURRENT_TIMESTAMP` devuelve el instante ya renderizado en UTC y quedaba
-- guardado como un literal sin zona: una reserva creada a las 20:17 en
-- Argentina se guardaba "23:17", y toda reserva hecha después de las 21:00
-- caía con la fecha del día siguiente.
--
-- El `@updatedAt` de Prisma suffer el mismo problema: lo arma el cliente Node
-- y lo manda en UTC.
--
-- Por qué es sin pérdida
-- ---------------------
-- `USING "col" AT TIME ZONE 'UTC'` interpreta el valor guardado como UTC y le
-- adjunta la zona. Los valores YA estaban en UTC (ver arriba), así que el
-- instante no cambia: sólo deja de ser ambiguo. Un `ALTER TABLE ... TYPE`
-- reescribe la tabla, pero son tablas chicas salvo Turno, que no tiene
-- columnas de timestamp y no se toca.
--
-- Lo que NO cambia con esta migración: los horarios de los turnos
-- (`Turno.fecha` como `date`, `Turno.horaInicio` y `Cancha.horaInicio/horaFin`
-- como `time without time zone`). Esos guardan hora de pared de Argentina y ya
-- eran correctos.

ALTER TABLE "AuditLog"
  ALTER COLUMN "performedAt" TYPE TIMESTAMP(3) WITH TIME ZONE
  USING "performedAt" AT TIME ZONE 'UTC';

ALTER TABLE "Cancha"
  ALTER COLUMN "createdAt" TYPE TIMESTAMP(3) WITH TIME ZONE
  USING "createdAt" AT TIME ZONE 'UTC';

ALTER TABLE "Cancha"
  ALTER COLUMN "modifiedAt" TYPE TIMESTAMP(3) WITH TIME ZONE
  USING "modifiedAt" AT TIME ZONE 'UTC';

ALTER TABLE "Pago"
  ALTER COLUMN "fechaPago" TYPE TIMESTAMP(3) WITH TIME ZONE
  USING "fechaPago" AT TIME ZONE 'UTC';

ALTER TABLE "PendingRegistration"
  ALTER COLUMN "createdAt" TYPE TIMESTAMP(3) WITH TIME ZONE
  USING "createdAt" AT TIME ZONE 'UTC';

ALTER TABLE "PendingRegistration"
  ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3) WITH TIME ZONE
  USING "updatedAt" AT TIME ZONE 'UTC';

ALTER TABLE "PendingRegistration"
  ALTER COLUMN "consumedAt" TYPE TIMESTAMP(3) WITH TIME ZONE
  USING "consumedAt" AT TIME ZONE 'UTC';

ALTER TABLE "PendingRegistration"
  ALTER COLUMN "lastOtpSentAt" TYPE TIMESTAMP(3) WITH TIME ZONE
  USING "lastOtpSentAt" AT TIME ZONE 'UTC';

ALTER TABLE "PendingRegistration"
  ALTER COLUMN "otpExpiresAt" TYPE TIMESTAMP(3) WITH TIME ZONE
  USING "otpExpiresAt" AT TIME ZONE 'UTC';

ALTER TABLE "Reserva"
  ALTER COLUMN "fechaAlta" TYPE TIMESTAMP(3) WITH TIME ZONE
  USING "fechaAlta" AT TIME ZONE 'UTC';

ALTER TABLE "Reserva"
  ALTER COLUMN "cancelledAt" TYPE TIMESTAMP(3) WITH TIME ZONE
  USING "cancelledAt" AT TIME ZONE 'UTC';

ALTER TABLE "Reserva"
  ALTER COLUMN "vencimientoAt" TYPE TIMESTAMP(3) WITH TIME ZONE
  USING "vencimientoAt" AT TIME ZONE 'UTC';

ALTER TABLE "TipoCancha"
  ALTER COLUMN "createdAt" TYPE TIMESTAMP(3) WITH TIME ZONE
  USING "createdAt" AT TIME ZONE 'UTC';

ALTER TABLE "TipoCancha"
  ALTER COLUMN "modifiedAt" TYPE TIMESTAMP(3) WITH TIME ZONE
  USING "modifiedAt" AT TIME ZONE 'UTC';

ALTER TABLE "Usuario"
  ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE
  USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "Usuario"
  ALTER COLUMN "modified_at" TYPE TIMESTAMP(3) WITH TIME ZONE
  USING "modified_at" AT TIME ZONE 'UTC';