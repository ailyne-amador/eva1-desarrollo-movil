import { useSyncExternalStore } from "react";
import NetInfo from "@react-native-community/netinfo";
import * as taskRepository from "../db/taskRepository";
import {
  createTask,
  deleteTask,
  deleteTaskPhoto,
  getTasks,
  getTaskPhoto,
  updateTask,
  uploadTaskPhoto,
} from "./api";
import { deletePhoto, savePhotoFromBytes } from "./photoStorage";

let syncRunning = false;
const syncListeners = new Set<(syncing: boolean) => void>();
const completionListeners = new Set<() => void>();

export function subscribeToSyncStatus(
  listener: (syncing: boolean) => void,
): () => void {
  syncListeners.add(listener);
  listener(syncRunning);
  return () => syncListeners.delete(listener);
}

export function useSyncStatus(): boolean {
  return useSyncExternalStore(
    subscribeToSyncStatus,
    () => syncRunning,
    () => false,
  );
}

export function addSyncCompletionListener(listener: () => void): () => void {
  completionListeners.add(listener);
  return () => completionListeners.delete(listener);
}

function setSyncing(syncing: boolean): void {
  syncRunning = syncing;
  syncListeners.forEach((listener) => listener(syncing));
  if (!syncing) {
    completionListeners.forEach((listener) => listener());
  }
}

export function isSyncing(): boolean {
  return syncRunning;
}

function isConnectionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("No se pudo conectar con el servidor")
  );
}

async function uploadPendingTasks(userId: string): Promise<void> {
  const pending = await taskRepository.listPending(userId);
  for (const task of pending) {
    try {
      if (task.syncStatus === "pending_delete") {
        if (task.serverId) {
          try {
            await deleteTask(String(task.serverId));
          } catch (error) {
            if (
              error instanceof Error &&
              error.message === "Tarea no encontrada"
            ) {
              // 404 cuenta como éxito.
            } else if (isConnectionError(error)) {
              throw error;
            } else {
              // Otro error: intentar de nuevo en el próximo ciclo.
              continue;
            }
          }
        }
        await taskRepository.physicallyDelete(task.id);
        continue;
      }

      if (task.syncStatus === "pending_create") {
        const created = await createTask({
          title: task.title,
          description: task.description ?? "",
          latitude: task.latitude,
          longitude: task.longitude,
          locationName: task.locationName,
          clientId: task.id,
        });
        await taskRepository.setSynced(task.id, created.id);
        continue;
      }

      if (task.syncStatus === "pending_update" && task.serverId) {
        try {
          await updateTask(String(task.serverId), {
            title: task.title,
            description: task.description ?? "",
            latitude: task.latitude,
            longitude: task.longitude,
            locationName: task.locationName,
          });
          await taskRepository.setSynced(task.id, task.serverId);
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === "Tarea no encontrada"
          ) {
            await taskRepository.physicallyDelete(task.id);
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      if (isConnectionError(error)) throw error;
      // Otros errores se dejan pendientes para el siguiente ciclo.
    }
  }
}

async function uploadPendingPhotos(userId: string): Promise<void> {
  const pending = await taskRepository.listPhotoPending(userId);
  for (const task of pending) {
    if (!task.serverId) continue;
    try {
      if (task.photoStatus === "pending_delete") {
        try {
          await deleteTaskPhoto(String(task.serverId));
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === "Tarea no encontrada"
          ) {
            // 404 cuenta como éxito.
          } else if (isConnectionError(error)) {
            throw error;
          } else {
            continue;
          }
        }
        await deletePhoto(task.id);
        await taskRepository.setPhotoStatus(task.id, "none", null);
        continue;
      }

      if (task.photoStatus === "pending_upload" && task.photoUri) {
        await uploadTaskPhoto(String(task.serverId), task.photoUri);
        await taskRepository.setPhotoStatus(task.id, "synced", task.photoUri);
      }
    } catch (error) {
      if (isConnectionError(error)) throw error;
    }
  }
}

async function downloadTasks(userId: string): Promise<void> {
  const serverTasks = await getTasks();
  const serverIds = new Set<number>();

  for (const serverTask of serverTasks) {
    serverIds.add(serverTask.id);
    await taskRepository.upsertFromServer(serverTask, userId);

    // Descargar foto del servidor si no existe localmente.
    const localTask = await taskRepository.getByServerId(serverTask.id);
    if (
      serverTask.hasPhoto &&
      localTask &&
      localTask.syncStatus === "synced" &&
      !localTask.photoUri
    ) {
      try {
        const arrayBuffer = await getTaskPhoto(String(serverTask.id));
        const bytes = new Uint8Array(arrayBuffer);
        const uri = await savePhotoFromBytes(localTask.id, bytes);
        await taskRepository.setPhotoStatus(localTask.id, "synced", uri);
      } catch {
        // Si falla la descarga, la foto se muestra desde el servidor cuando haya red.
      }
    }
  }

  // Eliminar tareas locales sincronizadas que ya no existen en el servidor.
  const localTasks = await taskRepository.list(userId);
  for (const localTask of localTasks) {
    if (localTask.serverId && !serverIds.has(localTask.serverId)) {
      await deletePhoto(localTask.id);
      await taskRepository.physicallyDelete(localTask.id);
    }
  }
}

export async function sync(userId: string): Promise<void> {
  const state = await NetInfo.fetch();
  if (!state.isConnected) return;
  if (syncRunning) return;

  setSyncing(true);
  try {
    await uploadPendingTasks(userId);
    await uploadPendingPhotos(userId);
    await downloadTasks(userId);
  } finally {
    setSyncing(false);
  }
}

export function requestSync(userId: string): void {
  void sync(userId);
}

export function initializeSync(userId: string): () => void {
  void sync(userId);
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) void sync(userId);
  });
}

// Utilidad para resolver conflictos en pruebas.
export function __resetSyncLock(): void {
  syncRunning = false;
}
