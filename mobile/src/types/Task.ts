export type SyncStatus =
  | "synced"
  | "pending_create"
  | "pending_update"
  | "pending_delete";

export type PhotoStatus =
  | "none"
  | "synced"
  | "pending_upload"
  | "pending_delete";

export interface Task {
  id: string;
  serverId: number | null;
  title: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  photoUri: string | null;
  photoStatus: PhotoStatus;
  syncStatus: SyncStatus;
  hasPhoto: boolean;
  createdAt: string;
  updatedAt: string;
}
