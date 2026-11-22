import { createHash, randomUUID } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET debe estar definido y tener al menos 32 caracteres.");
  }
  return secret;
}

function parseDuration(envName: string, defaultValue: string): SignOptions["expiresIn"] {
  const value = process.env[envName];
  if (!value) return defaultValue as SignOptions["expiresIn"];
  return value as SignOptions["expiresIn"];
}

export function assertJwtConfig(): void {
  getJwtSecret();
}

export function signAccessToken(userId: number): string {
  const expiresIn = parseDuration("JWT_ACCESS_EXPIRES_IN", "15m");
  return jwt.sign({ userId }, getJwtSecret(), { algorithm: "HS256", expiresIn });
}

export function verifyAccessToken(token: string): { userId: number } | null {
  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof payload.userId !== "number" ||
      !Number.isSafeInteger(payload.userId) ||
      payload.userId < 1
    ) {
      return null;
    }
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function generateRefreshToken(): string {
  return randomUUID();
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyRefreshToken(token: string, hash: string): boolean {
  return hashRefreshToken(token) === hash;
}

export function getRefreshExpiresInDays(): number {
  const raw = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";
  const match = /^\s*(\d+)\s*d\s*$/i.exec(raw);
  if (!match) return 7;
  return Number(match[1]);
}
