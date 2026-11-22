import { Platform } from "react-native";

function photoName(taskId: string) {
  return `${taskId.replace(/[^a-zA-Z0-9_-]/g, "_")}.jpg`;
}

export async function savePhoto(taskId: string, uri: string): Promise<string | Blob> {
  if (Platform.OS === "web") return uri;

  // FileSystem is native-only; defer loading it so web never evaluates the module.
  const { File, Paths } = await import("expo-file-system");
  const destination = new File(Paths.document, photoName(taskId));
  if (destination.exists) destination.delete();
  await new File(uri).copy(destination);
  return destination;
}

export async function getPhotoUri(taskId: string): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const { File, Paths } = await import("expo-file-system");
  const file = new File(Paths.document, photoName(taskId));
  return file.exists ? file.uri : null;
}

export async function deletePhoto(taskId: string): Promise<void> {
  if (Platform.OS === "web") return;

  const { File, Paths } = await import("expo-file-system");
  const file = new File(Paths.document, photoName(taskId));
  if (file.exists) file.delete();
}
