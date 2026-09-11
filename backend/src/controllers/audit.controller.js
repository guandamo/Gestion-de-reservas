import { prisma } from "../config/prisma.js";

/**
 * GET /api/audit?entity=&entityId=&performedBy=&limit=&offset=
 */
export async function listAudit(req, res) {
  const { entity, entityId, performedBy } = req.query;

  const where = {};
  if (entity) where.entity = String(entity);
  if (entityId) where.entityId = Number(entityId);
  if (performedBy) where.performedBy = Number(performedBy);

  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const offset = Number(req.query.offset ?? 0);

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { performedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return res.json({ items, total, limit, offset });
}
