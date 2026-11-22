import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AuthScreen } from "./AuthScreen";

const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockSignIn = jest.fn();
const mockSignUp = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({ signIn: mockSignIn, signUp: mockSignUp }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test("el formulario vacío muestra errores y no inicia sesión", async () => {
  const view = await render(<AuthScreen mode="login" />);

  await fireEvent.press(view.getByRole("button", { name: "Iniciar sesión" }));

  expect(await view.findByText("Ingresa un correo válido.")).toBeTruthy();
  expect(
    await view.findByText("La contraseña debe tener al menos 8 caracteres."),
  ).toBeTruthy();
  expect(mockSignIn).not.toHaveBeenCalled();
});

test("el acceso incorrecto muestra el mensaje recibido", async () => {
  mockSignIn.mockRejectedValueOnce(new Error("Credenciales inválidas"));
  const view = await render(<AuthScreen mode="login" />);

  await fireEvent.changeText(
    await view.findByLabelText("Correo electrónico"),
    "ana@example.com",
  );
  await fireEvent.changeText(
    await view.findByLabelText("Contraseña"),
    "password123",
  );
  await fireEvent.press(view.getByRole("button", { name: "Iniciar sesión" }));

  expect(await view.findByText("Credenciales inválidas")).toBeTruthy();
});

test("el acceso exitoso abre la lista", async () => {
  mockSignIn.mockResolvedValueOnce(undefined);
  const view = await render(<AuthScreen mode="login" />);

  await fireEvent.changeText(
    await view.findByLabelText("Correo electrónico"),
    "ana@example.com",
  );
  await fireEvent.changeText(
    await view.findByLabelText("Contraseña"),
    "password123",
  );
  await fireEvent.press(view.getByRole("button", { name: "Iniciar sesión" }));

  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
  expect(mockSignIn).toHaveBeenCalledWith("ana@example.com", "password123");
});

test("el registro abre la lista al crear la sesión", async () => {
  mockSignUp.mockResolvedValueOnce(undefined);
  const view = await render(<AuthScreen mode="register" />);

  await fireEvent.changeText(
    await view.findByLabelText("Correo electrónico"),
    "bea@example.com",
  );
  await fireEvent.changeText(
    await view.findByLabelText("Contraseña"),
    "password123",
  );
  await fireEvent.press(view.getByRole("button", { name: "Crear cuenta" }));

  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
  expect(mockSignUp).toHaveBeenCalledWith("bea@example.com", "password123");
});
