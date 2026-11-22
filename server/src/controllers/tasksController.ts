import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { createTaskSchema, taskSchema } from "../schemas/taskSchema";
import { deleteTaskPhoto as deletePhotoFile, resolveTaskPhoto, saveTaskPhoto } from "../services/taskPhoto";

function toTaskResponse<T extends { photoPath: string | null }>(task: T) {
  const { photoPath, ...fields } = task;
  return { ...fields, hasPhoto: Boolean(photoPath) };
}

// GET /tasks — lista las tareas del usuario, más recientes primero
export async function listTasks(req: Request, res: Response) {
  const tasks = await prisma.task.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
  });
  return res.json(tasks.map(toTaskResponse));
}
function parseTaskId(rawId: unknown): number | null {
  if (typeof rawId !== "string" || !/^\d+$/.test(rawId)) return null;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2_147_483_647) return null;
  return id;
}

// GET /tasks/:id — obtiene una tarea propia por ID
export async function getTask(req: Request, res: Response) {
  const id = parseTaskId(req.params.id);
  if (id === null) return res.status(400).json({ error: "ID de tarea no válido" });
  const task = await prisma.task.findFirst({ where: { id, userId: req.userId } });
  if (!task) return res.status(404).json({ error: "Tarea no encontrada" });
  return res.json(toTaskResponse(task));
}

// POST /tasks — crea una tarea para el usuario autenticado
export async function createTask(req: Request, res: Response) {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }
  const data = { ...parsed.data, userId: req.userId };
  const task = data.clientId
    ? await prisma.task.upsert({
        where: {
          userId_clientId: { userId: req.userId, clientId: data.clientId },
        },
        update: {},
        create: data,
      })
    : await prisma.task.create({ data });
  return res.status(201).json(toTaskResponse(task));
}

// PUT /tasks/:id — actualiza solo tareas propias
export async function updateTask(req: Request, res: Response) {
  const id = parseTaskId(req.params.id);
  if (id === null) return res.status(400).json({ error: "ID de tarea no válido" });
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }
  try {
    const task = await prisma.task.update({
      where: { id, userId: req.userId },
      data: parsed.data,
    });
    return res.json(toTaskResponse(task));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }
    throw error;
  }
}

// DELETE /tasks/:id — elimina solo tareas propias; 204 sin cuerpo si ok
export async function deleteTask(req: Request, res: Response) {
  const id = parseTaskId(req.params.id);
  if (id === null) return res.status(400).json({ error: "ID de tarea no válido" });
  try {
    const task = await prisma.task.delete({ where: { id, userId: req.userId } });
    await deletePhotoFile(task.photoPath);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }
    throw error;
  }
}

export async function uploadTaskPhoto(req: Request, res: Response) {
  const id = parseTaskId(req.params.id);
  if (id === null) return res.status(400).json({ error: "ID de tarea no válido" });
  if (!req.file) return res.status(400).json({ error: "La foto es obligatoria" });

  const task = await prisma.task.findFirst({ where: { id, userId: req.userId } });
  if (!task) return res.status(404).json({ error: "Tarea no encontrada" });

  const photoPath = await saveTaskPhoto(req.file.buffer, req.file.mimetype);
  if (!photoPath) return res.status(400).json({ error: "El contenido de la foto no es válido" });

  let updatedTask: NonNullable<typeof task>;
  try {
    updatedTask = await prisma.task.update({
      where: { id, userId: req.userId },
      data: { photoPath },
    });
  } catch (error) {
    await deletePhotoFile(photoPath);
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }
    throw error;
  }

  await deletePhotoFile(task.photoPath);
  return res.json(toTaskResponse(updatedTask));
}

export async function getTaskPhoto(req: Request, res: Response, next: NextFunction) {
  const id = parseTaskId(req.params.id);
  if (id === null) return res.status(400).json({ error: "ID de tarea no válido" });
  const task = await prisma.task.findFirst({ where: { id, userId: req.userId } });
  if (!task?.photoPath) return res.status(404).json({ error: "Foto no encontrada" });

  const absolutePath = resolveTaskPhoto(task.photoPath);
  if (!absolutePath) return res.status(404).json({ error: "Foto no encontrada" });
  res.sendFile(absolutePath, (error) => {
    if (!error) return;
    if (error instanceof Error && "code" in error && error.code === "ENOENT" && !res.headersSent) {
      res.status(404).json({ error: "Foto no encontrada" });
      return;
    }
    if (res.headersSent) {
      res.destroy(error instanceof Error ? error : undefined);
      return;
    }
    next(error);
  });
}

export async function deleteTaskPhoto(req: Request, res: Response) {
  const id = parseTaskId(req.params.id);
  if (id === null) return res.status(400).json({ error: "ID de tarea no válido" });
  const task = await prisma.task.findFirst({ where: { id, userId: req.userId } });
  if (!task) return res.status(404).json({ error: "Tarea no encontrada" });
  if (!task.photoPath) return res.status(204).send();

  try {
    await prisma.task.update({ where: { id, userId: req.userId }, data: { photoPath: null } });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }
    throw error;
  }
  await deletePhotoFile(task.photoPath);
  return res.status(204).send();
}
