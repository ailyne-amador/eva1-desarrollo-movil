import * as Location from "expo-location";

const LOCATION_TIMEOUT_MS = 5_000;

export type LocationResult =
  | { status: "ok"; latitude: number; longitude: number }
  | { status: "denied" }
  | { status: "unavailable" };

export async function getCurrentCoords(): Promise<LocationResult> {
  const { promise: timeout, resolve } =
    Promise.withResolvers<LocationResult>();
  const timeoutId = setTimeout(
    () => resolve({ status: "unavailable" }),
    LOCATION_TIMEOUT_MS,
  );

  try {
    const locationRequest = (async (): Promise<LocationResult> => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return { status: "denied" };

      const { coords } = await Location.getCurrentPositionAsync({});
      return {
        status: "ok",
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
    })();

    return await Promise.race([locationRequest, timeout]);
  } catch {
    return { status: "unavailable" };
  } finally {
    clearTimeout(timeoutId);
  }
}

const CITY_LOOKUP_TIMEOUT_MS = 5_000;

// La API gratuita exige coordenadas actuales obtenidas directamente del dispositivo.
export async function getCityName(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      CITY_LOOKUP_TIMEOUT_MS,
    );
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`,
        { signal: controller.signal },
      );
      if (!response.ok) return null;

      const result: unknown = await response.json();
      if (typeof result !== "object" || result === null) return null;
      const { city, locality } = result as {
        city?: unknown;
        locality?: unknown;
      };
      const cityName = typeof city === "string" ? city.trim() : "";
      const localityName = typeof locality === "string" ? locality.trim() : "";
      return cityName || localityName || null;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    return null;
  }
}

