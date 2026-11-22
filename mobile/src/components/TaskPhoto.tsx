import { useEffect, useState } from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";
import { getAuthToken } from "../services/authStorage";
import { getTaskPhotoUrl } from "../services/api";
import { getPhotoUri } from "../services/photoStorage";

export function TaskPhoto({
  taskId,
  accessibilityLabel,
  style,
}: {
  taskId: string;
  accessibilityLabel: string;
  style: StyleProp<ImageStyle>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [localUri, setLocalUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getPhotoUri(taskId)
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
  }, [taskId]);

  if (localUri) {
    return (
      <Image
        accessible
        accessibilityLabel={accessibilityLabel}
        source={{ uri: localUri }}
        resizeMode="cover"
        style={style}
      />
    );
  }

  if (!token) return null;
  return (
    <Image
      accessible
      accessibilityLabel={accessibilityLabel}
      source={{
        uri: getTaskPhotoUrl(taskId),
        headers: { Authorization: `Bearer ${token}` },
      }}
      resizeMode="cover"
      style={style}
    />
  );
}
