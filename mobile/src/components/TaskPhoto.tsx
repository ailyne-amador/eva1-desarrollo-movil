import { useEffect, useState } from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";
import { getAuthToken } from "../services/authStorage";
import { getTaskPhotoUrl } from "../services/api";
import { getPhotoUri } from "../services/photoStorage";
import type { Task } from "../types/Task";

export function TaskPhoto({
  task,
  accessibilityLabel,
  style,
}: {
  task: Task;
  accessibilityLabel: string;
  style: StyleProp<ImageStyle>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [localUri, setLocalUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getPhotoUri(task.id)
      .then((uri) => {
        if (active) setLocalUri(uri);
      })
      .catch(() => {});
    void getAuthToken()
      .then((value) => {
        if (active) setToken(value);
      })
      .catch(() => {
        if (active) setToken(null);
      });
    return () => {
      active = false;
    };
  }, [task.id, task.photoUri]);

  const sourceUri = localUri ?? task.photoUri;
  if (sourceUri) {
    return (
      <Image
        accessible
        accessibilityLabel={accessibilityLabel}
        source={{ uri: sourceUri }}
        resizeMode="cover"
        style={style}
      />
    );
  }

  if (!token || !task.serverId || !task.hasPhoto) return null;
  return (
    <Image
      accessible
      accessibilityLabel={accessibilityLabel}
      source={{
        uri: getTaskPhotoUrl(String(task.serverId)),
        headers: { Authorization: `Bearer ${token}` },
      }}
      resizeMode="cover"
      style={style}
    />
  );
}
