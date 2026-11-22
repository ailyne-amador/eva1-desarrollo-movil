import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { getCityName, getCurrentCoords } from "../services/location";
import { TaskForm } from "./TaskForm";

jest.mock("../services/location", () => ({
  getCityName: jest.fn(),
  getCurrentCoords: jest.fn(),
}));

const mockGetCityName = jest.mocked(getCityName);
const mockGetCurrentCoords = jest.mocked(getCurrentCoords);

beforeEach(() => jest.clearAllMocks());

test("no solicita ubicación por defecto", async () => {
  const onSave = jest.fn().mockResolvedValue(undefined);
  const onSuccess = jest.fn();
  const view = await render(
    <TaskForm onSave={onSave} onSuccess={onSuccess} />,
  );

  await fireEvent.changeText(view.getByLabelText("Título"), "Comprar leche");
  await fireEvent.press(view.getByRole("button", { name: "Guardar" }));

  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith({
      title: "Comprar leche",
      description: "",
      latitude: null,
      longitude: null,
      locationName: null,
    }),
  );
  expect(mockGetCurrentCoords).not.toHaveBeenCalled();
  expect(mockGetCityName).not.toHaveBeenCalled();
  expect(onSuccess).toHaveBeenCalledTimes(1);
});

test("guarda coordenadas y ciudad si se activa la opción", async () => {
  mockGetCurrentCoords.mockResolvedValue({
    status: "ok",
    latitude: 4.5,
    longitude: -74.1,
  });
  mockGetCityName.mockResolvedValue("Bogotá");
  const onSave = jest.fn().mockResolvedValue(undefined);
  const onSuccess = jest.fn();
  const view = await render(
    <TaskForm onSave={onSave} onSuccess={onSuccess} />,
  );

  await fireEvent(view.getByLabelText("Añadir ubicación"), "valueChange", true);
  await fireEvent.changeText(view.getByLabelText("Título"), "Comprar leche");
  await fireEvent.press(view.getByRole("button", { name: "Guardar" }));

  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith({
      title: "Comprar leche",
      description: "",
      latitude: 4.5,
      longitude: -74.1,
      locationName: "Bogotá",
    }),
  );
  expect(mockGetCityName).toHaveBeenCalledWith(4.5, -74.1);
  expect(onSuccess).toHaveBeenCalledTimes(1);
});

test("guarda sin ubicación si se deniega el permiso", async () => {
  mockGetCurrentCoords.mockResolvedValue({ status: "denied" });
  const onSave = jest.fn().mockResolvedValue(undefined);
  const onSuccess = jest.fn();
  const view = await render(
    <TaskForm onSave={onSave} onSuccess={onSuccess} />,
  );

  await fireEvent(view.getByLabelText("Añadir ubicación"), "valueChange", true);
  await fireEvent.changeText(view.getByLabelText("Título"), "Comprar leche");
  await fireEvent.press(view.getByRole("button", { name: "Guardar" }));

  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith({
      title: "Comprar leche",
      description: "",
      latitude: null,
      longitude: null,
      locationName: null,
    }),
  );
  expect(
    await view.findByText(
      "Tarea guardada, pero no se pudo registrar la ubicación.",
    ),
  ).toBeTruthy();
  expect(mockGetCityName).not.toHaveBeenCalled();
  expect(onSuccess).not.toHaveBeenCalled();
});

test("guarda coordenadas aunque BigDataCloud no encuentre una ciudad", async () => {
  mockGetCurrentCoords.mockResolvedValue({
    status: "ok",
    latitude: 4.5,
    longitude: -74.1,
  });
  mockGetCityName.mockResolvedValue(null);
  const onSave = jest.fn().mockResolvedValue(undefined);
  const onSuccess = jest.fn();
  const view = await render(
    <TaskForm onSave={onSave} onSuccess={onSuccess} />,
  );

  await fireEvent(view.getByLabelText("Añadir ubicación"), "valueChange", true);
  await fireEvent.changeText(view.getByLabelText("Título"), "Comprar leche");
  await fireEvent.press(view.getByRole("button", { name: "Guardar" }));

  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith({
      title: "Comprar leche",
      description: "",
      latitude: 4.5,
      longitude: -74.1,
      locationName: null,
    }),
  );
  expect(
    await view.findByText(
      "Tarea guardada, pero no se pudo determinar la ciudad.",
    ),
  ).toBeTruthy();
  expect(onSuccess).not.toHaveBeenCalled();
});
