import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import NewTaskScreen from "../app/task/new";
import { useTasks, type UseTasksReturn } from "./hooks/useTasks";
import { takePhoto } from "./services/camera";
import type { Task } from "./types/Task";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, replace: jest.fn() }),
}));
jest.mock("./hooks/useTasks", () => ({ useTasks: jest.fn() }));
jest.mock("./services/location", () => ({
  getCityName: jest.fn(),
  getCurrentCoords: jest.fn(),
}));
jest.mock("./services/camera", () => ({ takePhoto: jest.fn() }));

const mockAddTask = jest.fn();

const task: Task = {
  id: "task-1",
  serverId: null,
  title: "Comprar leche",
  description: null,
  latitude: null,
  longitude: null,
  locationName: null,
  photoUri: null,
  photoStatus: "none",
  syncStatus: "pending_create",
  hasPhoto: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAddTask.mockResolvedValue(task);
  jest.mocked(useTasks).mockReturnValue({
    addTask: mockAddTask,
    isAddingTask: false,
    isUploadingTaskPhoto: false,
  } as unknown as UseTasksReturn);
});

test("crea una tarea local y vuelve a la lista", async () => {
  const view = await render(
    <PaperProvider>
      <NewTaskScreen />
    </PaperProvider>,
  );

  await fireEvent.changeText(view.getByLabelText("Título"), "Comprar leche");
  await fireEvent.press(view.getByRole("button", { name: "Guardar" }));

  await waitFor(() => {
    expect(mockAddTask).toHaveBeenCalledTimes(1);
    expect(mockAddTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Comprar leche" }),
      undefined,
    );
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

test("pasa la foto al crear la tarea", async () => {
  jest.mocked(takePhoto).mockResolvedValue({
    status: "ok",
    uri: "file:///cache/foto.jpg",
  });

  const view = await render(
    <PaperProvider>
      <NewTaskScreen />
    </PaperProvider>,
  );

  await fireEvent.changeText(view.getByLabelText("Título"), "Comprar leche");
  await fireEvent.press(view.getByRole("button", { name: "Tomar foto" }));
  await view.findByLabelText("Vista previa de la foto");
  await fireEvent.press(view.getByRole("button", { name: "Guardar" }));

  await waitFor(() => {
    expect(mockAddTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Comprar leche" }),
      "file:///cache/foto.jpg",
    );
  });
});
