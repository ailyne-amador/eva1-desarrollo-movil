import * as Location from "expo-location";
import { getCityName, getCurrentCoords } from "./location";

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mockRequestPermission = jest.mocked(
  Location.requestForegroundPermissionsAsync,
);
const mockGetCurrentPosition = jest.mocked(Location.getCurrentPositionAsync);

const permissionResponse = (granted: boolean) =>
  ({
    status: granted ? "granted" : "denied",
    granted,
    canAskAgain: true,
    expires: "never",
  }) as Location.LocationPermissionResponse;

const currentPosition = {
  coords: {
    latitude: 4.5,
    longitude: -74.1,
    altitude: null,
    accuracy: 5,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: 0,
} as Location.LocationObject;

beforeEach(() => jest.clearAllMocks());
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("devuelve coordenadas con permiso concedido", async () => {
  mockRequestPermission.mockResolvedValue(permissionResponse(true));
  mockGetCurrentPosition.mockResolvedValue(currentPosition);

  await expect(getCurrentCoords()).resolves.toEqual({
    status: "ok",
    latitude: 4.5,
    longitude: -74.1,
  });
});

test("no consulta el GPS si se deniega el permiso", async () => {
  mockRequestPermission.mockResolvedValue(permissionResponse(false));

  await expect(getCurrentCoords()).resolves.toEqual({ status: "denied" });
  expect(mockGetCurrentPosition).not.toHaveBeenCalled();
});

test("devuelve no disponible si falla el GPS", async () => {
  mockRequestPermission.mockResolvedValue(permissionResponse(true));
  mockGetCurrentPosition.mockRejectedValueOnce(new Error("GPS apagado"));

  await expect(getCurrentCoords()).resolves.toEqual({
    status: "unavailable",
  });
});

test("devuelve no disponible si la ubicación excede el tiempo límite", async () => {
  jest.useFakeTimers();
  mockRequestPermission.mockResolvedValue(permissionResponse(true));
  mockGetCurrentPosition.mockImplementation(() => new Promise(() => {}));

  const result = getCurrentCoords();
  await jest.advanceTimersByTimeAsync(5_000);

  await expect(result).resolves.toEqual({ status: "unavailable" });
});

const apiResponse = (body: unknown, ok = true) =>
  ({ ok, json: jest.fn().mockResolvedValue(body) }) as unknown as Response;

test("consulta BigDataCloud en español y prefiere la ciudad", async () => {
  const fetchSpy = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(apiResponse({ city: "Bogotá", locality: "Chapinero" }));

  await expect(getCityName(4.5, -74.1)).resolves.toBe("Bogotá");
  expect(String(fetchSpy.mock.calls[0][0])).toBe(
    "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=4.5&longitude=-74.1&localityLanguage=es",
  );
});

test("usa locality si BigDataCloud no devuelve city", async () => {
  jest.spyOn(globalThis, "fetch").mockResolvedValue(
    apiResponse({ city: null, locality: "Chapinero" }),
  );

  await expect(getCityName(4.5, -74.1)).resolves.toBe("Chapinero");
});

test("no bloquea la tarea si BigDataCloud falla", async () => {
  jest.spyOn(globalThis, "fetch").mockResolvedValue(apiResponse({}, false));

  await expect(getCityName(4.5, -74.1)).resolves.toBeNull();
});
