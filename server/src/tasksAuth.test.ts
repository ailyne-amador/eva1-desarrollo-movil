import { readdir } from "node:fs/promises";
import { basename } from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { signAccessToken } from "./services/token";

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
  return `Bearer ${signAccessToken(userId)}`;
}
const pngBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/c3sAAAAASUVORK5CYII=", "base64");

function photoUpload(id = 1, userId = 7) {
  return request(app)
    .post(`/tasks/${id}/photo`)
    .set("Authorization", authHeader(userId))
    .attach("photo", pngBytes, { filename: "client-name.png", contentType: "image/png" });
}

async function uploadedFiles(): Promise<string[]> {
  try {
    return await readdir(new URL("../uploads/", import.meta.url));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}
function storedPhotoPath(): string {
  const call = prismaMock.task.update.mock.calls[0]?.[0];
  if (!call || typeof call !== "object" || !("data" in call)) throw new Error("No se guardó la foto");
  const data = call.data;
  if (!data || typeof data !== "object" || !("photoPath" in data) || typeof data.photoPath !== "string") {
    throw new Error("La ruta de la foto no es válida");
  }
  return data.photoPath;
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
      latitude: 4.5,
      longitude: -74.1,
      locationName: "Bogotá",
      photoPath: null,
      clientId: null,
      userId: 7,
    });

    const response = await request(app)
      .post("/tasks")
      .set("Authorization", authHeader(7))
      .send({
        title: "Tarea",
        latitude: 4.5,
        longitude: -74.1,
        locationName: "Bogotá",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: 1,
      title: "Tarea",
      latitude: 4.5,
      longitude: -74.1,
      locationName: "Bogotá",
      clientId: null,
      hasPhoto: false,
    });
    expect(response.body).not.toHaveProperty("photoPath");
    expect(prismaMock.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Tarea",
        description: null,
        latitude: 4.5,
        longitude: -74.1,
        locationName: "Bogotá",
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
      locationName: "Bogotá",
      photoPath: "uploads/7/photo.jpg",
      clientId,
      userId: 7,
    });

    const create = (title: string) =>
      request(app)
        .post("/tasks")
        .set("Authorization", authHeader(7))
        .send({
          title,
          clientId,
          latitude: 10,
          longitude: 20,
          locationName: "Bogotá",
        });
    const first = await create("Tarea inicial");
    const duplicate = await create("Reintento");

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(201);
    expect(first.body.locationName).toBe("Bogotá");
    expect(duplicate.body.locationName).toBe("Bogotá");
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
          locationName: "Bogotá",
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
  it("protects photo routes with authentication", async () => {
    const [upload, get, remove] = await Promise.all([
      request(app).post("/tasks/1/photo").attach("photo", pngBytes, { filename: "photo.png", contentType: "image/png" }),
      request(app).get("/tasks/1/photo"),
      request(app).delete("/tasks/1/photo"),
    ]);

    expect(upload.status).toBe(401);
    expect(get.status).toBe(401);
    expect(remove.status).toBe(401);
    expect(prismaMock.task.findFirst).not.toHaveBeenCalled();
  });

  it("uploads, serves, and deletes a task photo without exposing its path", async () => {
    prismaMock.task.findFirst.mockResolvedValueOnce({ id: 1, userId: 7, photoPath: null });
    prismaMock.task.update.mockResolvedValueOnce({ id: 1, title: "Tarea", photoPath: "stored" });

    const upload = await photoUpload();
    expect(upload.status).toBe(200);
    expect(upload.body.hasPhoto).toBe(true);
    expect(upload.body).not.toHaveProperty("photoPath");
    const photoPath = storedPhotoPath();
    expect(photoPath).toMatch(/^uploads\/[0-9a-f-]+\.png$/);
    expect(basename(photoPath)).not.toBe("client-name.png");

    prismaMock.task.findFirst.mockResolvedValueOnce({ id: 1, userId: 7, photoPath });
    const get = await request(app).get("/tasks/1/photo").set("Authorization", authHeader(7));
    expect(get.status).toBe(200);
    expect(get.headers["content-type"]).toMatch(/^image\/png/);
    expect(get.body).toEqual(pngBytes);

    prismaMock.task.findFirst.mockResolvedValueOnce({ id: 1, userId: 7, photoPath });
    prismaMock.task.update.mockResolvedValueOnce({ id: 1, photoPath: null });
    const remove = await request(app).delete("/tasks/1/photo").set("Authorization", authHeader(7));
    expect(remove.status).toBe(204);
    expect(prismaMock.task.update).toHaveBeenLastCalledWith({
      where: { id: 1, userId: 7 },
      data: { photoPath: null },
    });
    expect(await uploadedFiles()).not.toContain(basename(photoPath));

    prismaMock.task.findFirst.mockResolvedValueOnce({ id: 1, userId: 7, photoPath });
    prismaMock.task.update.mockResolvedValueOnce({ id: 1, photoPath: null });
    const repeatedDelete = await request(app).delete("/tasks/1/photo").set("Authorization", authHeader(7));
    expect(repeatedDelete.status).toBe(204);

  });

  it("rejects unsupported MIME types and invalid image signatures", async () => {
    const before = await uploadedFiles();
    const badMime = await request(app)
      .post("/tasks/1/photo")
      .set("Authorization", authHeader(7))
      .attach("photo", pngBytes, { filename: "photo.txt", contentType: "text/plain" });
    expect(badMime.status).toBe(400);
    expect(prismaMock.task.findFirst).not.toHaveBeenCalled();

    prismaMock.task.findFirst.mockResolvedValueOnce({ id: 1, userId: 7, photoPath: null });
    const badSignature = await request(app)
      .post("/tasks/1/photo")
      .set("Authorization", authHeader(7))
      .attach("photo", Buffer.from("not an image"), { filename: "photo.png", contentType: "image/png" });
    expect(badSignature.status).toBe(400);
    expect(prismaMock.task.update).not.toHaveBeenCalled();
    expect(await uploadedFiles()).toEqual(before);
  });

  it("returns 413 for photos larger than 5 MiB", async () => {
    const oversized = Buffer.concat([pngBytes, Buffer.alloc(5 * 1024 * 1024 - pngBytes.length + 1)]);
    const response = await request(app)
      .post("/tasks/1/photo")
      .set("Authorization", authHeader(7))
      .attach("photo", oversized, { filename: "large.png", contentType: "image/png" });

    expect(response.status).toBe(413);
    expect(prismaMock.task.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.task.update).not.toHaveBeenCalled();
  });

  it("does not write a photo for a task owned by someone else", async () => {
    const before = await uploadedFiles();
    prismaMock.task.findFirst.mockResolvedValueOnce(null);

    const response = await photoUpload(1, 2);

    expect(response.status).toBe(404);
    expect(prismaMock.task.update).not.toHaveBeenCalled();
    expect(await uploadedFiles()).toEqual(before);
  });

  it("cleans up a new photo when the task update fails", async () => {
    const before = await uploadedFiles();
    prismaMock.task.findFirst.mockResolvedValueOnce({ id: 1, userId: 7, photoPath: null });
    prismaMock.task.update.mockRejectedValueOnce(
      Object.assign(new Error("record not found"), { code: "P2025" }),
    );

    const response = await photoUpload();

    expect(response.status).toBe(404);
    expect(await uploadedFiles()).toEqual(before);
  });

  it("removes a task photo when deleting its task", async () => {
    prismaMock.task.findFirst.mockResolvedValueOnce({ id: 1, userId: 7, photoPath: null });
    prismaMock.task.update.mockResolvedValueOnce({ id: 1, title: "Tarea", photoPath: "stored" });
    const upload = await photoUpload();
    expect(upload.status).toBe(200);
    const photoPath = storedPhotoPath();

    prismaMock.task.delete.mockResolvedValueOnce({ id: 1, photoPath });
    const remove = await request(app).delete("/tasks/1").set("Authorization", authHeader(7));

    expect(remove.status).toBe(204);
    expect(await uploadedFiles()).not.toContain(basename(photoPath));
  });
});
