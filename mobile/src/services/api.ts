import {
  clearAuthToken,
  getAuthToken,
  getRefreshToken,
  saveAuthToken,
  saveRefreshToken,
} from "./authStorage";
import type { TaskFormValues } from "../schemas/taskSchema";
import type { Task } from "../types/Task";

type ApiTask = Omit<Task, "id"> & { id: number };
type RequestOptions = { authenticated?: boolean };
type UnauthorizedHandler = () => void | Promise<void>;

const connectionError = "No se pudo conectar con el servidor.";
let unauthorizedHandler: UnauthorizedHandler | undefined;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler ?? undefined;
}

export class UnauthorizedError extends Error {
  constructor(message = "La sesión expiró. Inicia sesión de nuevo.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!apiUrl) return false;

  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    await Promise.all([
      saveAuthToken(data.accessToken),
      saveRefreshToken(data.refreshToken),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function refreshTokens(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = performRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function doRequest(
  path: string,
  init?: RequestInit,
  { authenticated = true }: RequestOptions = {},
): Promise<Response> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!apiUrl) throw new Error(connectionError);

  const headers = new Headers(init?.headers);
  if (authenticated) {
    const token = await getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${apiUrl}${path}`, { ...init, headers });
}

async function request(
  path: string,
  init?: RequestInit,
  options: RequestOptions = {},
): Promise<Response> {
  const response = await doRequest(path, init, options);

  if (response.status === 401 && options.authenticated !== false) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      return doRequest(path, init, options);
    }
    await unauthorizedHandler?.();
    throw new UnauthorizedError();
  }

  if (response.status === 404) throw new Error("Tarea no encontrada");
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: unknown;
    } | null;
    throw new Error(
      typeof body?.error === "string" ? body.error : connectionError,
    );
  }
  return response;
}

type AuthUser = { id: number; email: string };
type AuthResponse = { accessToken: string; refreshToken: string; user: AuthUser };

async function authenticate(
  path: "/auth/login" | "/auth/register",
  email: string,
  password: string,
): Promise<AuthResponse> {
  const response = await request(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
    { authenticated: false },
  );
  return (await response.json()) as AuthResponse;
}

export function login(email: string, password: string) {
  return authenticate("/auth/login", email, password);
}

export function register(email: string, password: string) {
  return authenticate("/auth/register", email, password);
}

export async function logoutFromServer(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return;
  try {
    await request(
      "/auth/logout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      },
      { authenticated: false },
    );
  } catch {
    // Ignorar errores de red; el token local ya se borrará.
  }
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await request("/auth/me");
  return (await response.json()) as AuthUser;
}

function toTask({ id, ...task }: ApiTask): Task {
  return { ...task, id: String(id) };
}

export async function getTask(id: string): Promise<Task> {
  const response = await request(`/tasks/${encodeURIComponent(id)}`);
  return toTask((await response.json()) as ApiTask);
}

export async function getTasks(): Promise<Task[]> {
  const response = await request("/tasks");
  const tasks = (await response.json()) as ApiTask[];
  return tasks.map(toTask);
}

export async function createTask(values: TaskFormValues): Promise<Task> {
  const response = await request("/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  return toTask((await response.json()) as ApiTask);
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

export function getTaskPhotoUrl(id: string): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";
  return `${apiUrl}/tasks/${encodeURIComponent(id)}/photo`;
}

export async function uploadTaskPhoto(
  id: string,
  photo: string | Blob,
): Promise<void> {
  const file =
    typeof photo === "string" ? await (await fetch(photo)).blob() : photo;
  const body = new FormData();
  body.append("photo", file, "photo.jpg");
  await request(`/tasks/${encodeURIComponent(id)}/photo`, {
    method: "POST",
    body,
  });
}

export async function deleteTaskPhoto(id: string): Promise<void> {
  await request(`/tasks/${encodeURIComponent(id)}/photo`, { method: "DELETE" });
}
