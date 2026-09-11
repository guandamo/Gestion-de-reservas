import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/httpError.js";
import { createAuditLog } from "../services/audit/createAuditLog.js";
import { crearTipoCancha } from "../services/tipoCancha/crearTipoCancha.js";

export async function listCourtTypes(req, res) {
  const tipos = await prisma.tipoCancha.findMany({ orderBy: { descripcion: "asc" } });
  return res.json({ tipos });
}

export async function createCourtType(req, res) {
  const { descripcion } = req.body ?? {};
  const tipo = await crearTipoCancha({ descripcion });

  await prisma.$transaction(async (tx) => {
    await tx.tipoCancha.update({
      where: { id: tipo.id },
      data: { operacion: "ALTA", modificadoPor: req.user.id },
    });
    await createAuditLog({
      entity: "TipoCancha",
      entityId: tipo.id,
      operation: "ALTA",
      performedBy: req.user.id,
      oldValues: null,
      newValues: tipo,
      tx,
    });
  });

  const refreshed = await prisma.tipoCancha.findUnique({ where: { id: tipo.id } });
  return res.status(201).json(refreshed);
}

export async function updateCourtType(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID inválido");

  const { descripcion } = req.body ?? {};
  if (!descripcion || typeof descripcion !== "string" || descripcion.trim() === "") {
    throw new HttpError(400, "Descripción inválida");
  }

  const previous = await prisma.tipoCancha.findUnique({ where: { id } });
  if (!previous) throw new HttpError(404, "Tipo de cancha no encontrado");

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.tipoCancha.update({
      where: { id },
      data: {
        descripcion: descripcion.trim(),
        operacion: "MODIFICACION",
        modificadoPor: req.user.id,
      },
    });
    await createAuditLog({
      entity: "TipoCancha",
      entityId: id,
      operation: "MODIFICACION",
      performedBy: req.user.id,
      oldValues: previous,
      newValues: t,
      tx,
    });
    return t;
  });

  return res.json(updated);
}
