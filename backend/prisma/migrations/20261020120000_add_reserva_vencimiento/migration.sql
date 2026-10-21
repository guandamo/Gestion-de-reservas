-- Vencimiento automático de reservas pendientes de pago.
--
-- La columna es nullable a propósito: las filas existentes (CONFIRMADA /
-- CANCELADA, y las PENDIENTE creadas antes de esta migración) quedan con NULL
-- y el barrido periódico filtra por estado = 'PENDIENTE', así que nunca las toca.
ALTER TABLE "Reserva" ADD COLUMN "vencimientoAt" TIMESTAMP(3);

-- Índice compuesto para que el sweep no haga seq scan sobre la tabla.
CREATE INDEX "Reserva_estado_vencimientoAt_idx" ON "Reserva"("estado", "vencimientoAt");