import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Pressable, Text } from "react-native";
import { AuthProvider, useAuth } from "./AuthContext";
import {
  clearAuthToken,
  saveAuthToken,
  saveRefreshToken,
} from "../services/authStorage";
import { getTasks } from "../services/api";

let mockAccessToken: string | null = null;
let mockRefreshToken: string | null = null;
const mockFetch = jest.fn();

jest.mock("../services/authStorage", () => ({
  getAuthToken: jest.fn(() => Promise.resolve(mockAccessToken)),
  getRefreshToken: jest.fn(() => Promise.resolve(mockRefreshToken)),
  saveAuthToken: jest.fn((token: string) => {
    mockAccessToken = token;
    return Promise.resolve();
  }),
  saveRefreshToken: jest.fn((token: string) => {
    mockRefreshToken = token;
    return Promise.resolve();
  }),
  clearAuthToken: jest.fn(() => {
    mockAccessToken = null;
    mockRefreshToken = null;
    return Promise.resolve();
  }),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function AuthProbe() {
  const { status, signIn } = useAuth();
  return (
    <>
      <Text testID="auth-status">{status}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          void signIn("ana@example.com", "password123").catch(() => undefined)
        }
      >
        <Text>Iniciar sesión</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => void getTasks().catch(() => undefined)}
      >
        <Text>Cargar tareas</Text>
      </Pressable>
    </>
  );
}

async function renderAuth(client = new QueryClient()) {
  const result = await render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { ...result, client };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAccessToken = null;
  mockRefreshToken = null;
  mockFetch.mockReset();
  process.env.EXPO_PUBLIC_API_URL = "https://api.test";
  globalThis.fetch = mockFetch as typeof fetch;
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

test("guarda los tokens al iniciar sesión y limpia la caché anterior", async () => {
  const client = new QueryClient();
  client.setQueryData(["tasks"], [{ id: "de-otro-usuario" }]);
  mockFetch.mockResolvedValueOnce(
    jsonResponse({
      accessToken: "access-de-prueba",
      refreshToken: "refresh-de-prueba",
      user: { id: 1, email: "ana@example.com" },
    }),
  );
  const view = await renderAuth(client);

  await waitFor(() =>
    expect(view.getByTestId("auth-status").props.children).toBe("signedOut"),
  );
  await fireEvent.press(view.getByText("Iniciar sesión"));
  await waitFor(() =>
    expect(view.getByTestId("auth-status").props.children).toBe("signedIn"),
  );

  expect(saveAuthToken).toHaveBeenCalledWith("access-de-prueba");
  expect(saveRefreshToken).toHaveBeenCalledWith("refresh-de-prueba");
  expect(mockAccessToken).toBe("access-de-prueba");
  expect(mockRefreshToken).toBe("refresh-de-prueba");
  expect(client.getQueryData(["tasks"])).toBeUndefined();
  expect(mockFetch.mock.calls[0][0]).toBe("https://api.test/auth/login");
  const init = mockFetch.mock.calls[0][1] as RequestInit;
  expect(new Headers(init.headers).get("Authorization")).toBeNull();
});

test("mantiene el token si no puede validar /auth/me por falta de red", async () => {
  mockAccessToken = "access-guardado";
  mockFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
  const view = await renderAuth();

  await waitFor(() =>
    expect(view.getByTestId("auth-status").props.children).toBe("signedIn"),
  );
  expect(mockAccessToken).toBe("access-guardado");
  const init = mockFetch.mock.calls[0][1] as RequestInit;
  expect(new Headers(init.headers).get("Authorization")).toBe(
    "Bearer access-guardado",
  );
});

test("un 401 en /auth/me al iniciar cierra sesión si no hay refresh token", async () => {
  mockAccessToken = "access-guardado";
  mockFetch.mockResolvedValueOnce(jsonResponse({ error: "Token inválido" }, 401));
  const view = await renderAuth();

  await waitFor(() =>
    expect(view.getByTestId("auth-status").props.children).toBe("signedOut"),
  );
  expect(mockAccessToken).toBeNull();
  expect(mockRefreshToken).toBeNull();
  expect(clearAuthToken).toHaveBeenCalledTimes(1);
});

test("un 401 en /auth/me renueva la sesión con un refresh token válido", async () => {
  mockAccessToken = "access-viejo";
  mockRefreshToken = "refresh-válido";
  mockFetch
    .mockResolvedValueOnce(jsonResponse({ error: "Token inválido" }, 401))
    .mockResolvedValueOnce(
      jsonResponse({
        accessToken: "access-nuevo",
        refreshToken: "refresh-nuevo",
        user: { id: 1, email: "ana@example.com" },
      }),
    );
  const view = await renderAuth();

  await waitFor(() =>
    expect(view.getByTestId("auth-status").props.children).toBe("signedIn"),
  );
  expect(mockAccessToken).toBe("access-nuevo");
  expect(mockRefreshToken).toBe("refresh-nuevo");
  expect(saveAuthToken).toHaveBeenCalledWith("access-nuevo");
  expect(saveRefreshToken).toHaveBeenCalledWith("refresh-nuevo");
  expect(mockFetch.mock.calls[1][0]).toBe("https://api.test/auth/refresh");
});

test("un 401 cierra sesión y elimina la caché de tareas", async () => {
  mockAccessToken = "access-guardado";
  mockFetch
    .mockResolvedValueOnce(jsonResponse({ id: 1, email: "ana@example.com" }))
    .mockResolvedValueOnce(jsonResponse({ error: "Token inválido" }, 401));
  const client = new QueryClient();
  client.setQueryData(["tasks"], [{ id: "privada" }]);
  const view = await renderAuth(client);

  await waitFor(() =>
    expect(view.getByTestId("auth-status").props.children).toBe("signedIn"),
  );
  await fireEvent.press(view.getByText("Cargar tareas"));
  await waitFor(() =>
    expect(view.getByTestId("auth-status").props.children).toBe("signedOut"),
  );

  expect(mockAccessToken).toBeNull();
  expect(clearAuthToken).toHaveBeenCalledTimes(1);
  expect(client.getQueryData(["tasks"])).toBeUndefined();
  const init = mockFetch.mock.calls[1][1] as RequestInit;
  expect(new Headers(init.headers).get("Authorization")).toBe(
    "Bearer access-guardado",
  );
});
