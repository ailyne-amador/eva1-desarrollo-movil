import type { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { taskSchema } from "../schemas/taskSchema";

// GET /tasks — lista las tareas del usuario, más recientes primero
export async function listTasks(req: Request, res: Response) {
  const tasks = await prisma.task.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json(tasks);
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
  return res.json(task);
}

// POST /tasks — crea una tarea para el usuario autenticado
export async function createTask(req: Request, res: Response) {
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }
  const task = await prisma.task.create({
    data: { ...parsed.data, userId: req.userId },
  });
  return res.status(201).json(task);
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
    return res.json(task);
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
    await prisma.task.delete({ where: { id, userId: req.userId } });
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }
    throw error;
  }
}
