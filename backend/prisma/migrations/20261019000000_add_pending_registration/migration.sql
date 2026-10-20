-- Solicitudes de registro pendientes de verificación por OTP.
-- Se persiste el hash de la contraseña y el hash del código (nunca el código
-- en texto plano). El `consumedAt` marca cuándo el usuario confirmó y se
-- creó el `Usuario` definitivo.
--
-- El índice único parcial sobre `email WHERE consumedAt IS NULL` evita que
-- haya más de una solicitud activa para el mismo correo, al mismo tiempo
-- que permite reutilizar el email después de consumir o expirar.

CREATE TABLE "PendingRegistration" (
  "id" SERIAL PRIMARY KEY,
  "pendingToken" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "apellido" TEXT NOT NULL,
  "contrasenaHash" TEXT NOT NULL,
  "otpHash" TEXT NOT NULL,
  "otpExpiresAt" TIMESTAMP(3) NOT NULL,
  "lastOtpSentAt" TIMESTAMP(3) NOT NULL,
  "intentos" INTEGER NOT NULL DEFAULT 0,
  "reenvios" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3)
);

-- Unicidad del token (es lo que el cliente usa para verificar/reenviar).
CREATE UNIQUE INDEX "PendingRegistration_pendingToken_key"
  ON "PendingRegistration"("pendingToken");

-- Unicidad simple de email (lo que Prisma declara en el schema).
-- Prisma también genera este índice al regenerar el cliente.
CREATE UNIQUE INDEX "PendingRegistration_email_key"
  ON "PendingRegistration"("email");

-- Índice parcial: solo puede haber UNA solicitud activa por email.
-- Si consumedAt IS NULL, el email ya está en curso. Si está consumido
-- o expirado, se permite crear uno nuevo.
CREATE UNIQUE INDEX "PendingRegistration_email_active_key"
  ON "PendingRegistration"("email")
  WHERE "consumedAt" IS NULL;

-- Índice de soporte para limpieza por expiración.
CREATE INDEX "PendingRegistration_otpExpiresAt_idx"
  ON "PendingRegistration"("otpExpiresAt");