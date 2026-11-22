import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { hashPassword, verifyPassword } from "./services/password";
import {
  assertJwtConfig,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from "./services/token";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { create: vi.fn(), findUnique: vi.fn() },
    refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(),
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
    expect(verifyAccessToken(signAccessToken(7))).toEqual({ userId: 7 });
    expect(verifyAccessToken("invalid-token")).toBeNull();
  });
});

describe("refresh token helpers", () => {
  it("generates unique refresh tokens and hashes them with SHA-256", () => {
    const first = generateRefreshToken();
    const second = generateRefreshToken();
    expect(first).not.toBe(second);
    expect(hashRefreshToken(first)).toHaveLength(64);
  });
});

describe("POST /auth/register", () => {
  it("normalizes email and returns access and refresh tokens", async () => {
    prismaMock.user.create.mockResolvedValueOnce({ id: 1, email: "user@example.com" });
    prismaMock.refreshToken.create.mockResolvedValueOnce({ id: 1 });

    const response = await request(app)
      .post("/auth/register")
      .send({ email: "  USER@Example.com ", password: testPassword });

    expect(response.status).toBe(201);
    expect(response.body.user).toEqual({ id: 1, email: "user@example.com" });
    expect(response.body).not.toHaveProperty("passwordHash");
    expect(verifyAccessToken(response.body.accessToken)).toEqual({ userId: 1 });
    expect(typeof response.body.refreshToken).toBe("string");
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: { email: "user@example.com", passwordHash: expect.stringMatching(/^\$argon2id\$/) },
      select: { id: true, email: true },
    });
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: {
        tokenHash: expect.any(String),
        userId: 1,
        expiresAt: expect.any(Date),
      },
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
  it("returns tokens for valid credentials", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 2,
      email: "user@example.com",
      passwordHash,
    });
    prismaMock.refreshToken.create.mockResolvedValueOnce({ id: 1 });

    const response = await request(app)
      .post("/auth/login")
      .send({ email: "USER@example.com", password: testPassword });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({ id: 2, email: "user@example.com" });
    expect(verifyAccessToken(response.body.accessToken)).toEqual({ userId: 2 });
    expect(typeof response.body.refreshToken).toBe("string");
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

describe("POST /auth/refresh", () => {
  it("rotates a valid refresh token and returns new tokens", async () => {
    const oldToken = generateRefreshToken();
    const oldHash = hashRefreshToken(oldToken);
    const newRefreshToken = generateRefreshToken();
    prismaMock.refreshToken.findUnique.mockResolvedValueOnce({
      id: 5,
      tokenHash: oldHash,
      userId: 3,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      user: { id: 3, email: "user@example.com" },
    });
    prismaMock.$transaction.mockResolvedValueOnce([
      signAccessToken(3),
      newRefreshToken,
    ]);

    const response = await request(app).post("/auth/refresh").send({ refreshToken: oldToken });

    expect(response.status).toBe(200);
    expect(verifyAccessToken(response.body.accessToken)).toEqual({ userId: 3 });
    expect(response.body.refreshToken).toBe(newRefreshToken);
  });

  it("rejects an invalid refresh token", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValueOnce(null);

    const response = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: generateRefreshToken() });

    expect(response.status).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  it("deletes the refresh token and responds with 204", async () => {
    const token = generateRefreshToken();
    prismaMock.refreshToken.delete.mockResolvedValueOnce({ id: 1 });

    const response = await request(app).post("/auth/logout").send({ refreshToken: token });

    expect(response.status).toBe(204);
    expect(prismaMock.refreshToken.delete).toHaveBeenCalledWith({
      where: { tokenHash: hashRefreshToken(token) },
    });
  });

  it("responds with 204 even if the token does not exist", async () => {
    prismaMock.refreshToken.delete.mockRejectedValueOnce(new Error("not found"));

    const response = await request(app)
      .post("/auth/logout")
      .send({ refreshToken: generateRefreshToken() });

    expect(response.status).toBe(204);
  });
});

describe("GET /auth/me", () => {
  it("returns the authenticated user", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 7, email: "user@example.com" });

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${signAccessToken(7)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 7, email: "user@example.com" });
  });
});
