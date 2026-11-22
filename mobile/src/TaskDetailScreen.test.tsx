import { fireEvent, render } from "@testing-library/react-native";
import { Linking } from "react-native";
import { PaperProvider } from "react-native-paper";
import { useTask } from "./hooks/useTasks";
import type { Task } from "./types/Task";
import TaskDetailScreen from "../app/task/view/[id]";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "1" }),
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));
jest.mock("./hooks/useTasks", () => ({ useTask: jest.fn() }));

const task: Task = {
  id: "1",
  title: "Comprar leche",
  description: null,
  latitude: 4.5,
  longitude: -74.1,
  locationName: "Bogotá",
  clientId: null,
  hasPhoto: false,
};

const hookResult = (value: Task) => ({
  task: value,
  isLoading: false,
  isError: false,
  error: null,
  refetchTask: jest.fn(),
  updateTask: jest.fn(),
  isUpdatingTask: false,
  deleteTask: jest.fn(),
  isDeletingTask: false,
});

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

test("muestra la ubicación y abre el mapa con sus coordenadas", async () => {
  jest.mocked(useTask).mockReturnValue(hookResult(task));
  const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  const view = await render(
    <PaperProvider>
      <TaskDetailScreen />
    </PaperProvider>,
  );

  expect(view.getByText("Ubicación: Bogotá")).toBeTruthy();
  expect(view.queryByText("4.5, -74.1")).toBeNull();
  await fireEvent.press(view.getByRole("button", { name: "Ver en el mapa" }));

  expect(openURL).toHaveBeenCalledWith(
    "https://www.google.com/maps/search/?api=1&query=4.5,-74.1",
  );
});

test("muestra que la tarea no tiene ubicación", async () => {
  jest.mocked(useTask).mockReturnValue(
    hookResult({ ...task, latitude: null, longitude: null, locationName: null }),
  );
  const view = await render(
    <PaperProvider>
      <TaskDetailScreen />
    </PaperProvider>,
  );

  expect(view.getByText("Sin ubicación")).toBeTruthy();
  expect(view.queryByText("Ver en el mapa")).toBeNull();
});

test("no expone coordenadas cuando BigDataCloud no devuelve ciudad", async () => {
  jest.mocked(useTask).mockReturnValue(
    hookResult({ ...task, locationName: null }),
  );
  const view = await render(
    <PaperProvider>
      <TaskDetailScreen />
    </PaperProvider>,
  );

  expect(view.getByText("Ubicación: Ciudad no disponible")).toBeTruthy();
  expect(view.queryByText("4.5, -74.1")).toBeNull();
});
