import { render, screen } from "@testing-library/react-native";
import { TaskItem } from "./TaskItem";
import type { Task } from "../types/Task";

jest.mock("../services/authStorage", () => ({
  getAuthToken: jest.fn().mockResolvedValue("token"),
}));
jest.mock("../services/photoStorage", () => ({
  getPhotoUri: jest.fn().mockResolvedValue(null),
}));

function buildTask(overrides?: Partial<Task>): Task {
  return {
    id: "task-1",
    serverId: 1,
    title: "Preparar evaluación",
    description: null,
    latitude: null,
    longitude: null,
    locationName: null,
    photoUri: null,
    photoStatus: "none",
    syncStatus: "synced",
    hasPhoto: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test("muestra el título de la tarea", async () => {
  await render(
    <TaskItem
      task={buildTask()}
      onView={() => {}}
      onDelete={() => {}}
    />,
  );

  expect(screen.getByText("Preparar evaluación")).toBeTruthy();
  expect(screen.queryByLabelText("Foto de Preparar evaluación")).toBeNull();
});

test("muestra una miniatura accesible cuando la tarea tiene foto", async () => {
  await render(
    <TaskItem
      task={buildTask({
        hasPhoto: true,
        photoStatus: "synced",
        photoUri: "file:///documents/task-1.jpg",
      })}
      onView={() => {}}
      onDelete={() => {}}
    />,
  );

  expect(await screen.findByLabelText("Foto de Preparar evaluación")).toBeTruthy();
});

test("muestra indicador de pendiente cuando la tarea no está sincronizada", async () => {
  await render(
    <TaskItem
      task={buildTask({ syncStatus: "pending_create" })}
      onView={() => {}}
      onDelete={() => {}}
    />,
  );

  expect(screen.getByText("Pendiente de subir")).toBeTruthy();
});
