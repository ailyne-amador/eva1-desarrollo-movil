import * as ImagePicker from "expo-image-picker";
import { takePhoto } from "./camera";

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

const requestPermission = jest.mocked(ImagePicker.requestCameraPermissionsAsync);
const launchCamera = jest.mocked(ImagePicker.launchCameraAsync);

beforeEach(() => jest.clearAllMocks());

test("devuelve la foto cuando el permiso se concede", async () => {
  requestPermission.mockResolvedValue({ granted: true } as never);
  launchCamera.mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///foto.jpg" }],
  } as never);

  await expect(takePhoto()).resolves.toEqual({
    status: "ok",
    uri: "file:///foto.jpg",
  });
  expect(launchCamera).toHaveBeenCalledWith({
    mediaTypes: ["images"],
    quality: 0.7,
  });
});

test("devuelve cancelled si el usuario cierra la cámara", async () => {
  requestPermission.mockResolvedValue({ granted: true } as never);
  launchCamera.mockResolvedValue({ canceled: true, assets: [] } as never);

  await expect(takePhoto()).resolves.toEqual({ status: "cancelled" });
});

test("no abre la cámara si se deniega el permiso", async () => {
  requestPermission.mockResolvedValue({ granted: false } as never);

  await expect(takePhoto()).resolves.toEqual({ status: "denied" });
  expect(launchCamera).not.toHaveBeenCalled();
});

test("devuelve unavailable si falla la cámara", async () => {
  requestPermission.mockResolvedValue({ granted: true } as never);
  launchCamera.mockRejectedValue(new Error("Camera unavailable"));

  await expect(takePhoto()).resolves.toEqual({ status: "unavailable" });
});
