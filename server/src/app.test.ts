import { describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("./db/prisma", () => ({ prisma: {} }));

import { app } from "./app";

describe("GET /health", () => {
  it("returns the healthy status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
