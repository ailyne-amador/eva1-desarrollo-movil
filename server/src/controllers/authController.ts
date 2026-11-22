import type { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { authSchema } from "../schemas/authSchema";
import { hashPassword, verifyPassword } from "../services/password";
import {
  generateRefreshToken,
  getRefreshExpiresInDays,
  hashRefreshToken,
  signAccessToken,
  verifyRefreshToken,
} from "../services/token";

// Hash Argon2id con los mismos parámetros para igualar el trabajo si el correo no existe.
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$dKmhFidA6qq6hBmE/mU/4A$+Y3TnfO9JbAHlJF99JFts1vpEwqbUOrGDvFCDBAzsCc";

function refreshTokenExpiry(): Date {
  const days = getRefreshExpiresInDays();
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function createRefreshToken(userId: number): Promise<string> {
  const token = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(token),
      userId,
      expiresAt: refreshTokenExpiry(),
    },
  });
  return token;
}

async function rotateRefreshToken(
  oldToken: string,
  userId: number,
): Promise<{ newAccessToken: string; newRefreshToken: string }> {
  const tokenHash = hashRefreshToken(oldToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!existing || existing.expiresAt < new Date() || existing.userId !== userId) {
    throw new Error("Refresh token inválido");
  }
  const [newAccessToken, newRefreshToken] = await prisma.$transaction(async (tx) => {
    await tx.refreshToken.delete({ where: { id: existing.id } });
    const newToken = generateRefreshToken();
    await tx.refreshToken.create({
      data: {
        tokenHash: hashRefreshToken(newToken),
        userId,
        expiresAt: refreshTokenExpiry(),
      },
    });
    return [signAccessToken(userId), newToken];
  });
  return { newAccessToken, newRefreshToken };
}

async function rotateRefreshTokenForUser(
  existingId: number,
  userId: number,
): Promise<{ newAccessToken: string; newRefreshToken: string }> {
  const [newAccessToken, newRefreshToken] = await prisma.$transaction(async (tx) => {
    await tx.refreshToken.delete({ where: { id: existingId } });
    const newToken = generateRefreshToken();
    await tx.refreshToken.create({
      data: {
        tokenHash: hashRefreshToken(newToken),
        userId,
        expiresAt: refreshTokenExpiry(),
      },
    });
    return [signAccessToken(userId), newToken];
  });
  return { newAccessToken, newRefreshToken };
}

export async function register(req: Request, res: Response) {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  try {
    const user = await prisma.user.create({
      data: { email: parsed.data.email, passwordHash },
      select: { id: true, email: true },
    });
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(user.id),
      createRefreshToken(user.id),
    ]);
    return res.status(201).json({ accessToken, refreshToken, user });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return res.status(409).json({ error: "El correo ya está registrado" });
    }
    throw error;
  }
}

export async function login(req: Request, res: Response) {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, passwordHash: true },
  });
  const passwordMatches = await verifyPassword(
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    parsed.data.password,
  );
  if (!user || !passwordMatches) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user.id),
    createRefreshToken(user.id),
  ]);

  return res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email },
  });
}

export async function logout(req: Request, res: Response) {
  const refreshToken = typeof req.body.refreshToken === "string" ? req.body.refreshToken : "";
  if (refreshToken) {
    await prisma.refreshToken
      .delete({ where: { tokenHash: hashRefreshToken(refreshToken) } })
      .catch(() => undefined);
  }
  return res.status(204).send();
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (typeof refreshToken !== "string" || !refreshToken) {
    return res.status(401).json({ error: "Token de refresco inválido" });
  }

  const tokenHash = hashRefreshToken(refreshToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!existing || existing.expiresAt < new Date()) {
    return res.status(401).json({ error: "Token de refresco inválido" });
  }

  try {
    const { newAccessToken, newRefreshToken } = await rotateRefreshTokenForUser(
      existing.id,
      existing.user.id,
    );
    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: { id: existing.user.id, email: existing.user.email },
    });
  } catch {
    return res.status(401).json({ error: "Token de refresco inválido" });
  }
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true },
  });
  if (!user) return res.status(401).json({ error: "Sesión inválida" });
  return res.json(user);
}
