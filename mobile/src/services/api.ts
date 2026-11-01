import type { TaskFormValues } from "../schemas/taskSchema";
import type { Task } from "../types/Task";

type ApiTask = Omit<Task, "id"> & { id: number };

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
const connectionError = "No se pudo conectar con el servidor.";

async function request(path: string, init?: RequestInit): Promise<Response> {
  if (!apiUrl) throw new Error(connectionError);

  const response = await fetch(`${apiUrl}${path}`, init);
  if (!response.ok) throw new Error(connectionError);
  return response;
}

export async function getTasks(): Promise<Task[]> {
  const response = await request("/tasks");
  const tasks = (await response.json()) as ApiTask[];
  return tasks.map(({ id, ...task }) => ({ ...task, id: String(id) }));
}

export async function createTask(values: TaskFormValues): Promise<void> {
  await request("/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
}

export async function updateTask(
  id: string,
  values: TaskFormValues,
): Promise<void> {
  await request(`/tasks/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await request(`/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
}
