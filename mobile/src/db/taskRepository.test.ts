import { __resetMockDatabase } from "../__mocks__/expo-sqlite";
import * as taskRepository from "./taskRepository";

const USER_ID = "user-1";

function createInput(overrides?: Partial<taskRepository.CreateTaskInput>) {
  return {
    id: "task-1",
    title: "Tarea",
    description: null,
    latitude: null,
    longitude: null,
    locationName: null,
    photoUri: null,
    photoStatus: "none" as const,
    ...overrides,
  };
}

beforeEach(() => __resetMockDatabase());

test("crear y listar tareas", async () => {
  await taskRepository.create(createInput(), USER_ID);
  const tasks = await taskRepository.list(USER_ID);

  expect(tasks).toHaveLength(1);
  expect(tasks[0].title).toBe("Tarea");
  expect(tasks[0].syncStatus).toBe("pending_create");
});

test("aislamiento por usuario", async () => {
  await taskRepository.create(createInput({ id: "a" }), USER_ID);
  await taskRepository.create(createInput({ id: "b" }), "user-2");

  const tasks = await taskRepository.list(USER_ID);
  expect(tasks).toHaveLength(1);
  expect(tasks[0].id).toBe("a");
});

test("actualizar tarea y mantener pending_create", async () => {
  await taskRepository.create(createInput(), USER_ID);
  const updated = await taskRepository.update("task-1", { title: "Editada" });

  expect(updated?.title).toBe("Editada");
  expect(updated?.syncStatus).toBe("pending_create");
});

test("actualizar tarea sincronizada la marca pending_update", async () => {
  await taskRepository.create(createInput(), USER_ID);
  await taskRepository.setSynced("task-1", 42);
  const updated = await taskRepository.update("task-1", { title: "Editada" });

  expect(updated?.syncStatus).toBe("pending_update");
  expect(updated?.serverId).toBe(42);
});

test("no devuelve tareas marcadas para eliminar", async () => {
  await taskRepository.create(createInput(), USER_ID);
  await taskRepository.setSynced("task-1", 42);
  await taskRepository.markDeleted("task-1");

  const tasks = await taskRepository.list(USER_ID);
  expect(tasks).toHaveLength(0);
});

test("eliminar tarea no sincronizada la borra físicamente", async () => {
  await taskRepository.create(createInput(), USER_ID);
  await taskRepository.markDeleted("task-1");

  const task = await taskRepository.get("task-1");
  expect(task).toBeNull();
});

test("listPending incluye tareas pendientes", async () => {
  await taskRepository.create(createInput({ id: "create" }), USER_ID);
  await taskRepository.create(createInput({ id: "update" }), USER_ID);
  await taskRepository.setSynced("update", 1);
  await taskRepository.update("update", { title: "Editada" });

  const pending = await taskRepository.listPending(USER_ID);
  expect(pending.map((t) => t.id)).toEqual(
    expect.arrayContaining(["create", "update"]),
  );
});

test("upsertFromServer inserta tarea nueva", async () => {
  await taskRepository.upsertFromServer(
    {
      id: 99,
      title: "Del servidor",
      description: null,
      latitude: null,
      longitude: null,
      locationName: null,
      clientId: "client-99",
      hasPhoto: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    USER_ID,
  );

  const task = await taskRepository.get("client-99");
  expect(task?.title).toBe("Del servidor");
  expect(task?.syncStatus).toBe("synced");
  expect(task?.serverId).toBe(99);
});

test("upsertFromServer no sobrescribe cambios locales pendientes", async () => {
  await taskRepository.create(createInput(), USER_ID);
  await taskRepository.update("task-1", { title: "Local" });

  await taskRepository.upsertFromServer(
    {
      id: 42,
      title: "Servidor",
      description: null,
      latitude: null,
      longitude: null,
      locationName: null,
      clientId: "task-1",
      hasPhoto: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    USER_ID,
  );

  const task = await taskRepository.get("task-1");
  expect(task?.title).toBe("Local");
});
