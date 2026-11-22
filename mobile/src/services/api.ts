import { Platform } from "react-native";
import {
  getAuthToken,
  getRefreshToken,
  saveAuthToken,
  saveRefreshToken,
} from "./authStorage";
import type { TaskFormValues } from "../schemas/taskSchema";
import type { Task } from "../types/Task";

export type ServerTask = {
  id: number;
  title: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  clientId: string | null;
  hasPhoto: boolean;
  createdAt: string;
  updatedAt: string;
};

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

export async function getTask(id: string): Promise<ServerTask> {
  const response = await request(`/tasks/${encodeURIComponent(id)}`);
  return (await response.json()) as ServerTask;
}

export async function getTasks(): Promise<ServerTask[]> {
  const response = await request("/tasks");
  return (await response.json()) as ServerTask[];
}

export async function createTask(values: TaskFormValues): Promise<ServerTask> {
  const response = await request("/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  return (await response.json()) as ServerTask;
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

export function getTaskPhotoUrl(serverId: string): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";
  return `${apiUrl}/tasks/${encodeURIComponent(serverId)}/photo`;
}

export async function getTaskPhoto(serverId: string): Promise<ArrayBuffer> {
  const response = await request(`/tasks/${encodeURIComponent(serverId)}/photo`);
  return response.arrayBuffer();
}

export async function uploadTaskPhoto(
  id: string,
  photo: string | Blob,
): Promise<void> {
  // En nativo evitamos fetch().blob() para no disparar la advertencia de React Native Blob.
  let file: Blob;
  if (typeof photo === "string") {
    if (Platform.OS === "web") {
      file = await (await fetch(photo)).blob();
    } else {
      const { File } = await import("expo-file-system");
      file = new File(photo);
    }
  } else {
    file = photo;
  }
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

// Utilidad para convertir una tarea del servidor al modelo local.
// Se usa en pruebas y utilidades de sincronización.
export function serverTaskToLocal(
  serverTask: ServerTask,
  overrides?: Partial<Task>,
): Task {
  return {
    id: serverTask.clientId ?? String(serverTask.id),
    serverId: serverTask.id,
    title: serverTask.title,
    description: serverTask.description,
    latitude: serverTask.latitude,
    longitude: serverTask.longitude,
    locationName: serverTask.locationName,
    photoUri: null,
    photoStatus: serverTask.hasPhoto ? "synced" : "none",
    syncStatus: "synced",
    hasPhoto: serverTask.hasPhoto,
    createdAt: serverTask.createdAt,
    updatedAt: serverTask.updatedAt,
    ...overrides,
  };
}
