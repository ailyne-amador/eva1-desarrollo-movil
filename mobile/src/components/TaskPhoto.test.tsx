import { render, screen } from "@testing-library/react-native";
import { TaskPhoto } from "./TaskPhoto";
import { getPhotoUri } from "../services/photoStorage";
import { getAuthToken } from "../services/authStorage";
import type { Task } from "../types/Task";

jest.mock("../services/photoStorage", () => ({ getPhotoUri: jest.fn() }));
jest.mock("../services/authStorage", () => ({ getAuthToken: jest.fn() }));
jest.mock("../services/api", () => ({
  getTaskPhotoUrl: jest.fn(() => "http://localhost:3000/tasks/1/photo"),
}));

const style = { width: 10, height: 10 };

function buildTask(overrides?: Partial<Task>): Task {
  return {
    id: "task-1",
    serverId: 1,
    title: "Tarea",
    description: null,
    latitude: null,
    longitude: null,
    locationName: null,
    photoUri: null,
    photoStatus: "synced",
    syncStatus: "synced",
    hasPhoto: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

test("muestra la foto local si existe", async () => {
  jest.mocked(getPhotoUri).mockResolvedValue("file:///documents/task-1.jpg");
  jest.mocked(getAuthToken).mockResolvedValue("token");

  await render(
    <TaskPhoto task={buildTask()} accessibilityLabel="Foto" style={style} />,
  );

  const img = await screen.findByLabelText("Foto");
  expect(img.props.source.uri).toBe("file:///documents/task-1.jpg");
  expect(img.props.source.headers).toBeUndefined();
});

test("si no hay local, pide la foto remota con token", async () => {
  jest.mocked(getPhotoUri).mockResolvedValue(null);
  jest.mocked(getAuthToken).mockResolvedValue("token");

  await render(
    <TaskPhoto task={buildTask()} accessibilityLabel="Foto" style={style} />,
  );

  const img = await screen.findByLabelText("Foto");
  expect(img.props.source.uri).toBe("http://localhost:3000/tasks/1/photo");
  expect(img.props.source.headers).toEqual({ Authorization: "Bearer token" });
});
