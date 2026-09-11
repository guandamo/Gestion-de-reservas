import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/httpError.js";
import { createAuditLog } from "../services/audit/createAuditLog.js";
import { crearCancha } from "../services/cancha/crearCancha.js";
import { editarCancha } from "../services/cancha/editarCancha.js";

export async function listCourts(req, res) {
  const incluirInactivos = req.query.incluirInactivos === "true";

  const canchas = await prisma.cancha.findMany({
    where: incluirInactivos ? undefined : { activa: true },
    include: { tipoCancha: true },
    orderBy: { id: "asc" },
  });

  return res.json({ canchas });
}

export async function getCourt(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID inválido");

  const cancha = await prisma.cancha.findUnique({
    where: { id },
    include: { tipoCancha: true },
  });
  if (!cancha) throw new HttpError(404, "Cancha no encontrada");
  return res.json(cancha);
}

/**
 * POST /api/courts
 * Crea una cancha y delega al service existente (que además genera turnos).
 */
export async function createCourt(req, res) {
  const cancha = await crearCancha(req.body ?? {});
  // Registrar auditoría nivel 1 + AuditLog
  await prisma.$transaction(async (tx) => {
    await tx.cancha.update({
      where: { id: cancha.id },
      data: {
        operacion: "ALTA",
        modificadoPor: req.user.id,
      },
    });
    await createAuditLog({
      entity: "Cancha",
      entityId: cancha.id,
      operation: "ALTA",
      performedBy: req.user.id,
      oldValues: null,
      newValues: cancha,
      tx,
    });
  });
  const refreshed = await prisma.cancha.findUnique({
    where: { id: cancha.id },
    include: { tipoCancha: true },
  });
  return res.status(201).json(refreshed);
}

/**
 * PATCH /api/courts/:id
 * Edita campos permitidos. La auditoría ya vive en `editarCancha` solo si
 * ampliamos ese service; acá la manejamos a nivel controller.
 */
export async function updateCourt(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID inválido");

  const previous = await prisma.cancha.findUnique({ where: { id } });
  if (!previous) throw new HttpError(404, "Cancha no encontrada");

  const updated = await editarCancha(id, req.body ?? {});

  await prisma.$transaction(async (tx) => {
    await tx.cancha.update({
      where: { id },
      data: {
        operacion: "MODIFICACION",
        modificadoPor: req.user.id,
      },
    });
    await createAuditLog({
      entity: "Cancha",
      entityId: id,
      operation: updated.activa === previous.activa ? "MODIFICACION" :
        updated.activa ? "REACTIVACION" : "DESACTIVACION",
      performedBy: req.user.id,
      oldValues: previous,
      newValues: updated,
      tx,
    });
  });

  const refreshed = await prisma.cancha.findUnique({
    where: { id },
    include: { tipoCancha: true },
  });
  return res.json(refreshed);
}
