import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { signToken } from "./services/token";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { create: vi.fn(), findUnique: vi.fn() },
    task: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
vi.mock("./db/prisma", () => ({ prisma: prismaMock }));

import { app } from "./app";

const testSecret = "test-jwt-secret-with-at-least-32-characters";
const originalJwtSecret = process.env.JWT_SECRET;

beforeAll(() => {
  process.env.JWT_SECRET = testSecret;
});

afterAll(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

beforeEach(() => vi.resetAllMocks());

function authHeader(userId: number): string {
  return `Bearer ${signToken(userId)}`;
}


describe("tasks authentication", () => {
  it("rejects missing and invalid tokens", async () => {
    const missing = await request(app).get("/tasks");
    const invalid = await request(app).get("/tasks").set("Authorization", "Bearer invalid");

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
    expect(prismaMock.task.findMany).not.toHaveBeenCalled();
  });

  it("filters the task list by the authenticated user", async () => {
    prismaMock.task.findMany.mockResolvedValueOnce([]);

    const response = await request(app).get("/tasks").set("Authorization", authHeader(7));

    expect(response.status).toBe(200);
    expect(prismaMock.task.findMany).toHaveBeenCalledWith({
      where: { userId: 7 },
      orderBy: { createdAt: "desc" },
    });
  });

  it("creates a task for the authenticated user", async () => {
    prismaMock.task.create.mockResolvedValueOnce({
      id: 1,
      title: "Tarea",
      description: null,
      latitude: null,
      longitude: null,
      photoPath: null,
      clientId: null,
      userId: 7,
    });

    const response = await request(app)
      .post("/tasks")
      .set("Authorization", authHeader(7))
      .send({ title: "Tarea", latitude: null, longitude: null });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: 1,
      title: "Tarea",
      latitude: null,
      longitude: null,
      clientId: null,
      hasPhoto: false,
    });
    expect(response.body).not.toHaveProperty("photoPath");
    expect(prismaMock.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Tarea",
        description: null,
        latitude: null,
        longitude: null,
        userId: 7,
      }),
    });
  });
  it("rejects coordinates outside geographic ranges", async () => {
    const response = await request(app)
      .post("/tasks")
      .set("Authorization", authHeader(7))
      .send({ title: "Tarea", latitude: 91, longitude: 10 });

    expect(response.status).toBe(400);
    expect(prismaMock.task.create).not.toHaveBeenCalled();
    expect(prismaMock.task.upsert).not.toHaveBeenCalled();
  });

  it("requires latitude and longitude together", async () => {
    const response = await request(app)
      .post("/tasks")
      .set("Authorization", authHeader(7))
      .send({ title: "Tarea", latitude: 10 });

    expect(response.status).toBe(400);
    expect(prismaMock.task.create).not.toHaveBeenCalled();
    expect(prismaMock.task.upsert).not.toHaveBeenCalled();
  });

  it("returns the same task for repeated client IDs", async () => {
    const clientId = "550e8400-e29b-41d4-a716-446655440000";
    prismaMock.task.upsert.mockResolvedValue({
      id: 11,
      title: "Tarea guardada",
      description: null,
      latitude: 10,
      longitude: 20,
      photoPath: "uploads/7/photo.jpg",
      clientId,
      userId: 7,
    });

    const create = (title: string) =>
      request(app)
        .post("/tasks")
        .set("Authorization", authHeader(7))
        .send({ title, clientId, latitude: 10, longitude: 20 });
    const first = await create("Tarea inicial");
    const duplicate = await create("Reintento");

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(201);
    expect(prismaMock.task.upsert).toHaveBeenCalledTimes(2);
    expect(prismaMock.task.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { userId_clientId: { userId: 7, clientId } },
        update: {},
        create: expect.objectContaining({
          title: "Tarea inicial",
          latitude: 10,
          longitude: 20,
          clientId,
          userId: 7,
        }),
      }),
    );
    expect(duplicate.body.id).toBe(first.body.id);
    expect(duplicate.body.title).toBe("Tarea guardada");
    expect(duplicate.body.hasPhoto).toBe(true);
    expect(duplicate.body).not.toHaveProperty("photoPath");
    expect(prismaMock.task.create).not.toHaveBeenCalled();
  });

  it("returns 404 when another user reads, updates, or deletes a task", async () => {
    prismaMock.task.findFirst.mockResolvedValueOnce(null);
    prismaMock.task.update.mockRejectedValueOnce(
      Object.assign(new Error("record not found"), { code: "P2025" }),
    );
    prismaMock.task.delete.mockRejectedValueOnce(
      Object.assign(new Error("record not found"), { code: "P2025" }),
    );

    const get = await request(app)
      .get("/tasks/1")
      .set("Authorization", authHeader(2));
    const update = await request(app)
      .put("/tasks/1")
      .set("Authorization", authHeader(2))
      .send({ title: "Editar" });
    const remove = await request(app)
      .delete("/tasks/1")
      .set("Authorization", authHeader(2));

    expect(get.status).toBe(404);
    expect(update.status).toBe(404);
    expect(remove.status).toBe(404);
    expect(prismaMock.task.findFirst).toHaveBeenCalledWith({
      where: { id: 1, userId: 2 },
    });
    expect(prismaMock.task.update).toHaveBeenCalledWith({
      where: { id: 1, userId: 2 },
      data: { title: "Editar", description: null },
    });
    expect(prismaMock.task.delete).toHaveBeenCalledWith({
      where: { id: 1, userId: 2 },
    });
  });

  it("validates IDs consistently for every task mutation", async () => {
    const invalidGet = await request(app)
      .get("/tasks/0")
      .set("Authorization", authHeader(7));
    const invalidUpdate = await request(app)
      .put("/tasks/1.5")
      .set("Authorization", authHeader(7))
      .send({ title: "Editar" });
    const invalidDelete = await request(app)
      .delete("/tasks/2147483648")
      .set("Authorization", authHeader(7));

    expect(invalidGet.status).toBe(400);
    expect(invalidUpdate.status).toBe(400);
    expect(invalidDelete.status).toBe(400);
    expect(prismaMock.task.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.task.update).not.toHaveBeenCalled();
    expect(prismaMock.task.delete).not.toHaveBeenCalled();
  });
});
