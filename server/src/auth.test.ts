import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { hashPassword, verifyPassword } from "./services/password";
import { assertJwtConfig, signToken, verifyToken } from "./services/token";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { create: vi.fn(), findUnique: vi.fn() },
    task: {},
  },
}));
vi.mock("./db/prisma", () => ({ prisma: prismaMock }));

import { app } from "./app";

const testSecret = "test-jwt-secret-with-at-least-32-characters";
const originalJwtSecret = process.env.JWT_SECRET;
const testPassword = "correct-horse-battery";
let passwordHash: string;

beforeAll(async () => {
  process.env.JWT_SECRET = testSecret;
  passwordHash = await hashPassword(testPassword);
});

afterAll(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

beforeEach(() => vi.resetAllMocks());

describe("password service", () => {
  it("hashes with Argon2id, verifies credentials, and salts each hash", async () => {
    const firstHash = await hashPassword(testPassword);
    const secondHash = await hashPassword(testPassword);

    expect(firstHash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(firstHash, testPassword)).toBe(true);
    expect(await verifyPassword(firstHash, "incorrect-password")).toBe(false);
    expect(secondHash).not.toBe(firstHash);
  });
});

describe("JWT configuration", () => {
  it("requires a secret of at least 32 characters and validates signed tokens", () => {
    process.env.JWT_SECRET = "too-short";
    expect(assertJwtConfig).toThrow(/JWT_SECRET/);

    process.env.JWT_SECRET = testSecret;
    expect(assertJwtConfig).not.toThrow();
    expect(verifyToken(signToken(7))).toEqual({ userId: 7 });
    expect(verifyToken("invalid-token")).toBeNull();
  });
});

describe("POST /auth/register", () => {
  it("normalizes email and never returns the password hash", async () => {
    prismaMock.user.create.mockResolvedValueOnce({ id: 1, email: "user@example.com" });

    const response = await request(app)
      .post("/auth/register")
      .send({ email: "  USER@Example.com ", password: testPassword });

    expect(response.status).toBe(201);
    expect(response.body.user).toEqual({ id: 1, email: "user@example.com" });
    expect(response.body).not.toHaveProperty("passwordHash");
    expect(verifyToken(response.body.token)).toEqual({ userId: 1 });
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: { email: "user@example.com", passwordHash: expect.stringMatching(/^\$argon2id\$/) },
      select: { id: true, email: true },
    });
  });

  it("returns 409 when the email already exists", async () => {
    prismaMock.user.create.mockRejectedValueOnce(
      Object.assign(new Error("duplicate email"), { code: "P2002" }),
    );

    const response = await request(app)
      .post("/auth/register")
      .send({ email: "user@example.com", password: testPassword });

    expect(response.status).toBe(409);
  });

  it("rejects a short password before touching the database", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({ email: "user@example.com", password: "short" });

    expect(response.status).toBe(400);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});

describe("POST /auth/login", () => {
  it("returns a token for valid credentials", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 2,
      email: "user@example.com",
      passwordHash,
    });

    const response = await request(app)
      .post("/auth/login")
      .send({ email: "USER@example.com", password: testPassword });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({ id: 2, email: "user@example.com" });
    expect(verifyToken(response.body.token)).toEqual({ userId: 2 });
  });

  it("uses the same credentials error for an unknown email and a wrong password", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ id: 2, email: "user@example.com", passwordHash })
      .mockResolvedValueOnce(null);

    const wrongPassword = await request(app)
      .post("/auth/login")
      .send({ email: "user@example.com", password: "wrong-password" });
    const unknownEmail = await request(app)
      .post("/auth/login")
      .send({ email: "missing@example.com", password: testPassword });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual({ error: "Credenciales inválidas" });
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });
});

describe("GET /auth/me", () => {
  it("returns the authenticated user", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 7, email: "user@example.com" });

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${signToken(7)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 7, email: "user@example.com" });
  });
});
