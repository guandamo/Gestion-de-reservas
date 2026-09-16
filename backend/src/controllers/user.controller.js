import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/httpError.js";
import { createAuditLog } from "../services/audit/createAuditLog.js";

const ROLES_PERMITIDOS = new Set(["ADMIN", "USUARIO"]);

function sanitize(user) {
  if (!user) return null;
  const { contrasena, ...rest } = user;
  return rest;
}

export async function listUsers(req, res) {
  const { rol, buscar } = req.query;

  const where = {};
  if (rol && ROLES_PERMITIDOS.has(String(rol))) where.rol = String(rol);
  if (buscar) {
    where.OR = [
      { nombre: { contains: String(buscar), mode: "insensitive" } },
      { apellido: { contains: String(buscar), mode: "insensitive" } },
      { email: { contains: String(buscar), mode: "insensitive" } },
    ];
  }

  const usuarios = await prisma.usuario.findMany({
    where,
    orderBy: { id: "asc" },
  });

  return res.json({ usuarios: usuarios.map(sanitize) });
}

export async function getUser(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "ID inválido");
  }

  const user = await prisma.usuario.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, "Usuario no encontrado");

  return res.json(sanitize(user));
}

/**
 * PATCH /api/users/:id
 * Modifica nombre/apellido/email/rol. No toca contraseña ni estado aquí.
 */
export async function updateUser(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "ID inválido");
  }

  const { nombre, apellido, email, rol } = req.body ?? {};

  const previous = await prisma.usuario.findUnique({ where: { id } });
  if (!previous) throw new HttpError(404, "Usuario no encontrado");

  const data = {};
  if (typeof nombre === "string" && nombre.trim()) data.nombre = nombre.trim();
  if (typeof apellido === "string" && apellido.trim())
    data.apellido = apellido.trim();
  if (typeof email === "string" && email.trim())
    data.email = email.trim().toLowerCase();
  if (rol && ROLES_PERMITIDOS.has(rol)) data.rol = rol;

  if (Object.keys(data).length === 0) {
    throw new HttpError(400, "Nada para modificar");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.usuario.update({
      where: { id },
      data: {
        ...data,
        modificadoPor: req.user.id,
        ultimoCambio: "MODIFICACION",
      },
    });
    await createAuditLog({
      entity: "Usuario",
      entityId: u.id,
      operation: "MODIFICACION",
      performedBy: req.user.id,
      oldValues: previous,
      newValues: u,
      tx,
    });
    return u;
  });

  return res.json(sanitize(updated));
}

/**
 * PATCH /api/users/:id/status
 * Body: { activo: boolean }   suspensión lógica
 */
export async function updateUserStatus(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "ID inválido");
  }

  const { activo } = req.body ?? {};
  if (typeof activo !== "boolean") {
    throw new HttpError(400, "El campo 'activo' debe ser boolean");
  }

  const previous = await prisma.usuario.findUnique({ where: { id } });
  if (!previous) throw new HttpError(404, "Usuario no encontrado");

  const operacion = activo ? "REACTIVACION" : "SUSPENSION";

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.usuario.update({
      where: { id },
      data: {
        activo,
        modificadoPor: req.user.id,
        ultimoCambio: operacion,
      },
    });
    await createAuditLog({
      entity: "Usuario",
      entityId: u.id,
      operation: operacion,
      performedBy: req.user.id,
      oldValues: previous,
      newValues: u,
      tx,
    });
    return u;
  });

  return res.json(sanitize(updated));
}
