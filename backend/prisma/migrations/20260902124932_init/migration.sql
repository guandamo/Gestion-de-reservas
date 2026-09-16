-- CreateEnum
CREATE TYPE "EstadoTurno" AS ENUM ('DISPONIBLE', 'RESERVADO');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PAGADO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'MERCADOPAGO');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('USUARIO', 'ADMIN');

-- CreateTable
CREATE TABLE "TipoCancha" (
    "id" SERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "TipoCancha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cancha" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "horaInicio" TIME NOT NULL,
    "horaFin" TIME NOT NULL,
    "precioTurno" DECIMAL(10,2) NOT NULL,
    "idTipoCancha" INTEGER NOT NULL,

    CONSTRAINT "Cancha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turno" (
    "id" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "horaInicio" TIME NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoTurno" NOT NULL DEFAULT 'DISPONIBLE',
    "idCancha" INTEGER NOT NULL,

    CONSTRAINT "Turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" SERIAL NOT NULL,
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'PENDIENTE',
    "cancelledAt" TIMESTAMP(3),
    "idUsuario" INTEGER NOT NULL,
    "idTurno" INTEGER NOT NULL,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" SERIAL NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fechaPago" TIMESTAMP(3),
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "metodo" "MetodoPago" NOT NULL,
    "idReserva" INTEGER NOT NULL,
    "idMercadoPago" TEXT,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contrasena" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'USUARIO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "ultimoCambio" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoCancha_descripcion_key" ON "TipoCancha"("descripcion");

-- CreateIndex
CREATE UNIQUE INDEX "Turno_idCancha_fecha_horaInicio_key" ON "Turno"("idCancha", "fecha", "horaInicio");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_idReserva_key" ON "Pago"("idReserva");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_idMercadoPago_key" ON "Pago"("idMercadoPago");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_telefono_key" ON "Usuario"("telefono");

-- AddForeignKey
ALTER TABLE "Cancha" ADD CONSTRAINT "Cancha_idTipoCancha_fkey" FOREIGN KEY ("idTipoCancha") REFERENCES "TipoCancha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_idCancha_fkey" FOREIGN KEY ("idCancha") REFERENCES "Cancha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_idTurno_fkey" FOREIGN KEY ("idTurno") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_idReserva_fkey" FOREIGN KEY ("idReserva") REFERENCES "Reserva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
