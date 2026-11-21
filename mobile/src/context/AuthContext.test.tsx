import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Pressable, Text } from "react-native";
import { AuthProvider, useAuth } from "./AuthContext";
import { clearAuthToken, saveAuthToken } from "../services/authStorage";
import { getTasks } from "../services/api";

let mockStoredToken: string | null = null;
const mockFetch = jest.fn();

jest.mock("../services/authStorage", () => ({
  getAuthToken: jest.fn(() => Promise.resolve(mockStoredToken)),
  saveAuthToken: jest.fn((token: string) => {
    mockStoredToken = token;
    return Promise.resolve();
  }),
  clearAuthToken: jest.fn(() => {
    mockStoredToken = null;
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
  mockStoredToken = null;
  mockFetch.mockReset();
  process.env.EXPO_PUBLIC_API_URL = "https://api.test";
  globalThis.fetch = mockFetch as typeof fetch;
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

test("guarda el token al iniciar sesión y limpia la caché anterior", async () => {
  const client = new QueryClient();
  client.setQueryData(["tasks"], [{ id: "de-otro-usuario" }]);
  mockFetch.mockResolvedValueOnce(
    jsonResponse({
      token: "token-de-prueba",
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

  expect(saveAuthToken).toHaveBeenCalledWith("token-de-prueba");
  expect(mockStoredToken).toBe("token-de-prueba");
  expect(client.getQueryData(["tasks"])).toBeUndefined();
  expect(mockFetch.mock.calls[0][0]).toBe("https://api.test/auth/login");
  const init = mockFetch.mock.calls[0][1] as RequestInit;
  expect(new Headers(init.headers).get("Authorization")).toBeNull();
});

test("mantiene el token si no puede validar /auth/me por falta de red", async () => {
  mockStoredToken = "token-guardado";
  mockFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
  const view = await renderAuth();

  await waitFor(() =>
    expect(view.getByTestId("auth-status").props.children).toBe("signedIn"),
  );
  expect(mockStoredToken).toBe("token-guardado");
  const init = mockFetch.mock.calls[0][1] as RequestInit;
  expect(new Headers(init.headers).get("Authorization")).toBe(
    "Bearer token-guardado",
  );
});

test("un 401 cierra sesión y elimina la caché de tareas", async () => {
  mockStoredToken = "token-guardado";
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

  expect(mockStoredToken).toBeNull();
  expect(clearAuthToken).toHaveBeenCalledTimes(1);
  expect(client.getQueryData(["tasks"])).toBeUndefined();
  const init = mockFetch.mock.calls[1][1] as RequestInit;
  expect(new Headers(init.headers).get("Authorization")).toBe(
    "Bearer token-guardado",
  );
});
