import { prisma } from "../../config/prisma.js";

/**
 * Crea una entrada en AuditLog. Pensada para usarse dentro de una
 * transacción Prisma existente (pasando `tx`) o de forma autónoma.
 *
 * @param {object} args
 * @param {string} args.entity        Nombre de la entidad (e.g. "Usuario")
 * @param {number|string} args.entityId
 * @param {string} args.operation     e.g. "ALTA", "MODIFICACION", "SUSPENSION"
 * @param {number|null} args.performedBy  id del Usuario que hizo la operación
 * @param {object|null} args.oldValues
 * @param {object|null} args.newValues
 * @param {object} [args.tx]          Cliente Prisma transaccional
 */
export async function createAuditLog({
  entity,
  entityId,
  operation,
  performedBy,
  oldValues,
  newValues,
  tx,
}) {
  if (!entity || entityId == null || !operation) {
    throw new Error("createAuditLog: entity, entityId y operation son obligatorios");
  }

  const client = tx ?? prisma;

  // No persistimos contraseñas / tokens / secretos
  const sanitize = (obj) => {
    if (!obj) return null;
    const copy = { ...obj };
    delete copy.contrasena;
    delete copy.password;
    delete copy.token;
    delete copy.jwt;
    return copy;
  };

  return client.auditLog.create({
    data: {
      entity: String(entity),
      entityId: Number(entityId),
      operation: String(operation),
      performedBy: performedBy ?? null,
      oldValues: sanitize(oldValues) ?? undefined,
      newValues: sanitize(newValues) ?? undefined,
    },
  });
}
