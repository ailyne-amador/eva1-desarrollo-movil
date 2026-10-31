import type { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { taskSchema } from "../schemas/taskSchema";

// GET /tasks — lista todas, más recientes primero
export async function listTasks(_req: Request, res: Response) {
  const tasks = await prisma.task.findMany({ orderBy: { createdAt: "desc" } });
  res.json(tasks);
}

// POST /tasks — crea una tarea; 201 si ok, 400 si el body no valida
export async function createTask(req: Request, res: Response) {
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }
  const task = await prisma.task.create({ data: parsed.data });
  res.status(201).json(task);
}

// PUT /tasks/:id — actualiza; 404 si no existe
export async function updateTask(req: Request, res: Response) {
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }
  const id = Number(req.params.id);
  try {
    const task = await prisma.task.update({ where: { id }, data: parsed.data });
    res.json(task);
  } catch {
    res.status(404).json({ error: "Tarea no encontrada" });
  }
}

// DELETE /tasks/:id — elimina; 204 sin cuerpo si ok
export async function deleteTask(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Tarea no encontrada" });
  }
}
