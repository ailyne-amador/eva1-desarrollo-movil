import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import NewTaskScreen from "../app/task/new";
import { useTasks } from "./hooks/useTasks";
import { takePhoto } from "./services/camera";
import { savePhoto } from "./services/photoStorage";
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
jest.mock("./services/photoStorage", () => ({
  savePhoto: jest.fn(),
  deletePhoto: jest.fn(),
}));

const mockAddTask = jest.fn();
const mockUpdateTask = jest.fn();
const mockUploadTaskPhoto = jest.fn();
const mockDeleteTaskPhoto = jest.fn();
const task: Task = {
  id: "1",
  title: "Comprar leche",
  description: null,
  latitude: null,
  longitude: null,
  locationName: null,
  clientId: null,
  hasPhoto: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAddTask.mockResolvedValue(task);
  mockUpdateTask.mockResolvedValue(undefined);
  mockUploadTaskPhoto
    .mockRejectedValueOnce(new Error("Sin conexión"))
    .mockResolvedValue(undefined);
  mockDeleteTaskPhoto.mockResolvedValue(undefined);
  jest.mocked(takePhoto).mockResolvedValue({
    status: "ok",
    uri: "file:///cache/foto.jpg",
  });
  jest.mocked(savePhoto).mockResolvedValue("file:///document/foto.jpg");
  jest.mocked(useTasks).mockReturnValue({
    addTask: mockAddTask,
    updateTask: mockUpdateTask,
    uploadTaskPhoto: mockUploadTaskPhoto,
    deleteTaskPhoto: mockDeleteTaskPhoto,
    isAddingTask: false,
    isUploadingTaskPhoto: false,
  } as unknown as ReturnType<typeof useTasks>);
});

test("reintentar una foto fallida no duplica la tarea", async () => {
  const view = await render(
    <PaperProvider>
      <NewTaskScreen />
    </PaperProvider>,
  );

  await fireEvent.changeText(view.getByLabelText("Título"), "Comprar leche");
  await fireEvent.press(view.getByRole("button", { name: "Tomar foto" }));
  await view.findByLabelText("Vista previa de la foto");
  await fireEvent.press(view.getByRole("button", { name: "Guardar" }));
  expect(
    await view.findByText(
      "La tarea ya se creó, pero no se pudo adjuntar la foto (Sin conexión). Pulsa Guardar para reintentar.",
    ),
  ).toBeTruthy();

  await fireEvent.press(view.getByRole("button", { name: "Guardar" }));
  await waitFor(() => {
    expect(mockAddTask).toHaveBeenCalledTimes(1);
    expect(mockUpdateTask).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({ title: "Comprar leche" }),
    );
    expect(mockUploadTaskPhoto).toHaveBeenCalledTimes(2);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
