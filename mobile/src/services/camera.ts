import * as ImagePicker from "expo-image-picker";

export type CameraResult =
  | { status: "ok"; uri: string }
  | { status: "cancelled" }
  | { status: "denied" }
  | { status: "unavailable" };

export async function takePhoto(): Promise<CameraResult> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: "denied" };

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (result.canceled) return { status: "cancelled" };
    const uri = result.assets[0]?.uri;
    return uri ? { status: "ok", uri } : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
