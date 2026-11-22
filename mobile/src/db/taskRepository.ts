import { getDatabase } from "./database";
import type { PhotoStatus, SyncStatus, Task } from "../types/Task";

type DbTask = {
  id: string;
  server_id: number | null;
  user_id: string;
  title: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  photo_uri: string | null;
  photo_status: PhotoStatus;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

function toTask(row: DbTask): Task {
  return {
    id: row.id,
    serverId: row.server_id,
    title: row.title,
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    locationName: row.location_name,
    photoUri: row.photo_uri,
    photoStatus: row.photo_status,
    syncStatus: row.sync_status,
    hasPhoto:
      row.photo_status !== "none" && row.photo_status !== "pending_delete",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CreateTaskInput = {
  id: string;
  title: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  photoUri: string | null;
  photoStatus: PhotoStatus;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
};

export async function list(userId: string): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DbTask>(
    `SELECT * FROM tasks
     WHERE user_id = ? AND sync_status != ?
     ORDER BY updated_at DESC`,
    [userId, "pending_delete"],
  );
  return rows.map(toTask);
}

export async function listPending(userId: string): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DbTask>(
    `SELECT * FROM tasks
     WHERE user_id = ? AND sync_status IN ('pending_create', 'pending_update', 'pending_delete')
     ORDER BY updated_at ASC`,
    [userId],
  );
  return rows.map(toTask);
}

export async function listPhotoPending(userId: string): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DbTask>(
    `SELECT * FROM tasks
     WHERE user_id = ? AND sync_status != ? AND photo_status IN ('pending_upload', 'pending_delete')
     ORDER BY updated_at ASC`,
    [userId, "pending_delete"],
  );
  return rows.map(toTask);
}

export async function get(id: string): Promise<Task | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<DbTask>("SELECT * FROM tasks WHERE id = ?", [
    id,
  ]);
  return row ? toTask(row) : null;
}

export async function create(
  input: CreateTaskInput,
  userId: string,
): Promise<Task> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO tasks (
      id, server_id, user_id, title, description,
      latitude, longitude, location_name, photo_uri, photo_status,
      sync_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      null,
      userId,
      input.title,
      input.description,
      input.latitude,
      input.longitude,
      input.locationName,
      input.photoUri,
      input.photoStatus,
      "pending_create",
      now,
      now,
    ],
  );
  const task = await get(input.id);
  if (!task) throw new Error("No se pudo crear la tarea local");
  return task;
}

export async function update(
  id: string,
  input: UpdateTaskInput,
): Promise<Task | null> {
  const db = await getDatabase();
  const current = await db.getFirstAsync<DbTask>(
    "SELECT * FROM tasks WHERE id = ?",
    [id],
  );
  if (!current) return null;
  if (current.sync_status === "pending_delete") return toTask(current);

  const fields: string[] = [];
  const values: (string | number | null | boolean)[] = [];

  if (input.title !== undefined) {
    fields.push("title = ?");
    values.push(input.title);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description);
  }
  if (input.latitude !== undefined) {
    fields.push("latitude = ?");
    values.push(input.latitude);
  }
  if (input.longitude !== undefined) {
    fields.push("longitude = ?");
    values.push(input.longitude);
  }
  if (input.locationName !== undefined) {
    fields.push("location_name = ?");
    values.push(input.locationName);
  }

  if (fields.length === 0) return toTask(current);

  const nextSyncStatus =
    current.sync_status === "pending_create" ? "pending_create" : "pending_update";
  fields.push("sync_status = ?");
  values.push(nextSyncStatus);
  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  await db.runAsync(
    `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  return get(id);
}

export async function markDeleted(id: string): Promise<void> {
  const db = await getDatabase();
  const current = await db.getFirstAsync<DbTask>(
    "SELECT * FROM tasks WHERE id = ?",
    [id],
  );
  if (!current) return;

  if (current.sync_status === "pending_create") {
    await db.runAsync("DELETE FROM tasks WHERE id = ?", [id]);
    return;
  }

  await db.runAsync(
    `UPDATE tasks
     SET sync_status = ?, updated_at = ?
     WHERE id = ?`,
    ["pending_delete", new Date().toISOString(), id],
  );
}

export async function physicallyDelete(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM tasks WHERE id = ?", [id]);
}

export async function setSynced(
  id: string,
  serverId: number,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE tasks
     SET server_id = ?, sync_status = ?, updated_at = ?
     WHERE id = ?`,
    [serverId, "synced", new Date().toISOString(), id],
  );
}

export async function setPhotoStatus(
  id: string,
  status: PhotoStatus,
  uri: string | null,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE tasks
     SET photo_status = ?, photo_uri = ?, updated_at = ?
     WHERE id = ?`,
    [status, uri, new Date().toISOString(), id],
  );
}

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

export async function upsertFromServer(
  serverTask: ServerTask,
  userId: string,
): Promise<void> {
  const db = await getDatabase();
  const localId = serverTask.clientId ?? String(serverTask.id);

  const existing = await db.getFirstAsync<DbTask>(
    "SELECT * FROM tasks WHERE id = ? OR server_id = ?",
    [localId, serverTask.id],
  );

  if (existing && existing.sync_status !== "synced") {
    // Hay cambios locales pendientes: gana lo local.
    return;
  }

  const photoStatus: PhotoStatus = serverTask.hasPhoto ? "synced" : "none";
  const photoUri =
    existing?.photo_uri && photoStatus === "synced" ? existing.photo_uri : null;

  if (existing) {
    await db.runAsync(
      `UPDATE tasks SET
        server_id = ?,
        title = ?,
        description = ?,
        latitude = ?,
        longitude = ?,
        location_name = ?,
        photo_status = ?,
        photo_uri = ?,
        sync_status = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        serverTask.id,
        serverTask.title,
        serverTask.description,
        serverTask.latitude,
        serverTask.longitude,
        serverTask.locationName,
        photoStatus,
        photoUri,
        "synced",
        serverTask.updatedAt,
        existing.id,
      ],
    );
  } else {
    await db.runAsync(
      `INSERT INTO tasks (
        id, server_id, user_id, title, description,
        latitude, longitude, location_name, photo_status, photo_uri,
        sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        localId,
        serverTask.id,
        userId,
        serverTask.title,
        serverTask.description,
        serverTask.latitude,
        serverTask.longitude,
        serverTask.locationName,
        photoStatus,
        null,
        "synced",
        serverTask.createdAt,
        serverTask.updatedAt,
      ],
    );
  }
}

export async function clearUserData(userId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM tasks WHERE user_id = ?", [userId]);
}

export async function getByServerId(serverId: number): Promise<Task | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<DbTask>(
    "SELECT * FROM tasks WHERE server_id = ?",
    [serverId],
  );
  return row ? toTask(row) : null;
}
