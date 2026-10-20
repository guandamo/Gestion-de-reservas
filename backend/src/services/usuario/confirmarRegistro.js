import { prisma } from "../../config/prisma.js";
import { createAuditLog } from "../audit/createAuditLog.js";

/**
 * Crea el `Usuario` definitivo a partir de una `PendingRegistration` validada.
 *
 * Es la "segunda mitad" del registro, separada de `pendingRegistration.service.js`.
 * La primera mitad (`crearSolicitud`) valida inputs, hashea la contraseña,
 * crea el PendingRegistration y envía el OTP. Esta función corre dentro de una
 * transacción junto con el marcado de `consumedAt`, por lo que el Usuario se
 * crea una sola vez y la solicitud nunca se reutiliza.
 *
 * Mantiene los mismos efectos que el `registerUsuario` original:
 *   - rol USUARIO, activo true, ultimoCambio "ALTA"
 *   - self-reference modificadoPor
 *   - auditoría nivel 1 (auto-asignación) + AuditLog nivel 2
 */
export async function confirmarRegistroYCrearUsuario(pending, tx = null) {
  const client = tx ?? prisma;

  const nuevoUsuario = await client.usuario.create({
    data: {
      nombre: pending.nombre,
      apellido: pending.apellido,
      email: pending.email,
      contrasena: pending.contrasenaHash,
      rol: "USUARIO",
      activo: true,
      ultimoCambio: "ALTA",
    },
  });

  await client.usuario.update({
    where: { id: nuevoUsuario.id },
    data: { modificadoPor: nuevoUsuario.id },
  });

  await createAuditLog({
    entity: "Usuario",
    entityId: nuevoUsuario.id,
    operation: "ALTA",
    performedBy: nuevoUsuario.id,
    oldValues: null,
    newValues: { ...nuevoUsuario, contrasena: undefined },
    tx: client,
  });

  return nuevoUsuario;
}