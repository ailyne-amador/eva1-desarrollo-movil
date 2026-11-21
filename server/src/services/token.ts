import jwt, { type SignOptions } from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET debe estar definido y tener al menos 32 caracteres.");
  }
  return secret;
}

export function assertJwtConfig(): void {
  getJwtSecret();
}

export function signToken(userId: number): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"];
  return jwt.sign({ userId }, getJwtSecret(), { algorithm: "HS256", expiresIn });
}

export function verifyToken(token: string): { userId: number } | null {
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
