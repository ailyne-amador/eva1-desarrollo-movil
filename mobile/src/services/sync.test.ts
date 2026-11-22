import NetInfo from "@react-native-community/netinfo";
import { sync } from "./sync";
import type { ServerTask } from "./api";
import type { Task } from "../types/Task";

const netInfoMock = NetInfo as unknown as {
  __setConnected: (value: boolean) => void;
};

const mockCreateTask = jest.fn();
const mockUpdateTask = jest.fn();
const mockDeleteTask = jest.fn();
const mockGetTasks = jest.fn();
const mockUploadTaskPhoto = jest.fn();
const mockDeleteTaskPhoto = jest.fn();
const mockGetTaskPhoto = jest.fn();

jest.mock("./api", () => ({
  createTask: (...args: unknown[]) => mockCreateTask(...args),
  updateTask: (...args: unknown[]) => mockUpdateTask(...args),
  deleteTask: (...args: unknown[]) => mockDeleteTask(...args),
  getTasks: () => mockGetTasks(),
  uploadTaskPhoto: (...args: unknown[]) => mockUploadTaskPhoto(...args),
  deleteTaskPhoto: (...args: unknown[]) => mockDeleteTaskPhoto(...args),
  getTaskPhoto: (...args: unknown[]) => mockGetTaskPhoto(...args),
  getTaskPhotoUrl: () => "",
}));

jest.mock("./photoStorage", () => ({
  savePhotoFromBytes: jest.fn().mockResolvedValue("file:///document/foto.jpg"),
  deletePhoto: jest.fn().mockResolvedValue(undefined),
}));

const mockListPending = jest.fn();
const mockListPhotoPending = jest.fn();
const mockSetSynced = jest.fn();
const mockSetPhotoStatus = jest.fn();
const mockPhysicallyDelete = jest.fn();
const mockUpsertFromServer = jest.fn();
const mockList = jest.fn();
const mockGetByServerId = jest.fn();

jest.mock("../db/taskRepository", () => ({
  listPending: () => mockListPending(),
  listPhotoPending: () => mockListPhotoPending(),
  setSynced: (...args: unknown[]) => mockSetSynced(...args),
  setPhotoStatus: (...args: unknown[]) => mockSetPhotoStatus(...args),
  physicallyDelete: (...args: unknown[]) => mockPhysicallyDelete(...args),
  upsertFromServer: (...args: unknown[]) => mockUpsertFromServer(...args),
  list: () => mockList(),
  getByServerId: (...args: unknown[]) => mockGetByServerId(...args),
}));

const USER_ID = "user-1";

function task(overrides?: Partial<Task>): Task {
  return {
    id: "local-1",
    serverId: null,
    title: "Tarea",
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
    ...overrides,
  };
}

function serverTask(id: number, clientId: string | null): ServerTask {
  return {
    id,
    title: "Tarea",
    description: null,
    latitude: null,
    longitude: null,
    locationName: null,
    clientId,
    hasPhoto: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  netInfoMock.__setConnected(true);
  mockGetTasks.mockResolvedValue([]);
  mockList.mockResolvedValue([]);
  mockListPhotoPending.mockResolvedValue([]);
});

test("sube una tarea creada offline y la marca como sincronizada", async () => {
  mockListPending.mockResolvedValue([task()]);
  mockCreateTask.mockResolvedValue(serverTask(42, "local-1"));

  await sync(USER_ID);

  expect(mockCreateTask).toHaveBeenCalledTimes(1);
  expect(mockCreateTask).toHaveBeenCalledWith(
    expect.objectContaining({ title: "Tarea", clientId: "local-1" }),
  );
  expect(mockSetSynced).toHaveBeenCalledWith("local-1", 42);
});

test("un fallo de red no llama a la API", async () => {
  netInfoMock.__setConnected(false);
  mockListPending.mockResolvedValue([task()]);

  await sync(USER_ID);

  expect(mockCreateTask).not.toHaveBeenCalled();
});

test("edita una tarea sincronizada offline", async () => {
  mockListPending.mockResolvedValue([
    task({ syncStatus: "pending_update", serverId: 10, title: "Editada" }),
  ]);
  mockUpdateTask.mockResolvedValue(undefined);

  await sync(USER_ID);

  expect(mockUpdateTask).toHaveBeenCalledWith(
    "10",
    expect.objectContaining({ title: "Editada" }),
  );
  expect(mockSetSynced).toHaveBeenCalledWith("local-1", 10);
});

test("elimina una tarea sincronizada offline", async () => {
  mockListPending.mockResolvedValue([
    task({ syncStatus: "pending_delete", serverId: 20 }),
  ]);
  mockDeleteTask.mockResolvedValue(undefined);

  await sync(USER_ID);

  expect(mockDeleteTask).toHaveBeenCalledWith("20");
  expect(mockPhysicallyDelete).toHaveBeenCalledWith("local-1");
});

test("un 404 al eliminar cuenta como éxito", async () => {
  mockListPending.mockResolvedValue([
    task({ syncStatus: "pending_delete", serverId: 30 }),
  ]);
  mockDeleteTask.mockRejectedValue(new Error("Tarea no encontrada"));

  await sync(USER_ID);

  expect(mockDeleteTask).toHaveBeenCalledWith("30");
  expect(mockPhysicallyDelete).toHaveBeenCalledWith("local-1");
});

test("marca la tarea como sincronizada tras crearla", async () => {
  mockListPending.mockResolvedValue([task()]);
  mockCreateTask.mockResolvedValue(serverTask(42, "local-1"));

  await sync(USER_ID);

  expect(mockCreateTask).toHaveBeenCalledTimes(1);
  expect(mockSetSynced).toHaveBeenCalledWith("local-1", 42);
});

test("gana lo local cuando hay cambios pendientes", async () => {
  mockListPending.mockResolvedValue([]);
  mockGetTasks.mockResolvedValue([
    { ...serverTask(60, "local-6"), title: "Versión del servidor" },
  ]);

  await sync(USER_ID);

  expect(mockUpsertFromServer).toHaveBeenCalledWith(
    expect.objectContaining({ id: 60, title: "Versión del servidor" }),
    USER_ID,
  );
});

test("descarga tareas nuevas del servidor", async () => {
  mockGetTasks.mockResolvedValue([serverTask(70, null)]);

  await sync(USER_ID);

  expect(mockUpsertFromServer).toHaveBeenCalledWith(
    expect.objectContaining({ id: 70 }),
    USER_ID,
  );
});

test("elimina tareas locales sincronizadas que ya no existen en el servidor", async () => {
  mockList.mockResolvedValue([task({ syncStatus: "synced", serverId: 80 })]);
  mockGetTasks.mockResolvedValue([]);

  await sync(USER_ID);

  expect(mockPhysicallyDelete).toHaveBeenCalledWith("local-1");
});

test("sube foto pendiente después de crear la tarea", async () => {
  mockListPending.mockResolvedValue([
    task({ serverId: 90, syncStatus: "synced" }),
  ]);
  mockListPhotoPending.mockResolvedValue([
    task({
      serverId: 90,
      syncStatus: "synced",
      photoUri: "file:///document/local-9.jpg",
      photoStatus: "pending_upload",
    }),
  ]);
  mockUploadTaskPhoto.mockResolvedValue(undefined);

  await sync(USER_ID);

  expect(mockUploadTaskPhoto).toHaveBeenCalledWith(
    "90",
    "file:///document/local-9.jpg",
  );
  expect(mockSetPhotoStatus).toHaveBeenCalledWith(
    "local-1",
    "synced",
    "file:///document/local-9.jpg",
  );
});

test("borra foto pendiente en el servidor", async () => {
  mockListPending.mockResolvedValue([]);
  mockListPhotoPending.mockResolvedValue([
    task({
      serverId: 100,
      syncStatus: "synced",
      photoStatus: "pending_delete",
    }),
  ]);
  mockDeleteTaskPhoto.mockResolvedValue(undefined);

  await sync(USER_ID);

  expect(mockDeleteTaskPhoto).toHaveBeenCalledWith("100");
  expect(mockSetPhotoStatus).toHaveBeenCalledWith("local-1", "none", null);
});
