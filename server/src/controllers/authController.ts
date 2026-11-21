import type { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { authSchema } from "../schemas/authSchema";
import { hashPassword, verifyPassword } from "../services/password";
import { signToken } from "../services/token";

// Hash Argon2id con los mismos parámetros para igualar el trabajo si el correo no existe.
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$dKmhFidA6qq6hBmE/mU/4A$+Y3TnfO9JbAHlJF99JFts1vpEwqbUOrGDvFCDBAzsCc";

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
    return res.status(201).json({ token: signToken(user.id), user });
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

  return res.json({
    token: signToken(user.id),
    user: { id: user.id, email: user.email },
  });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true },
  });
  if (!user) return res.status(401).json({ error: "Sesión inválida" });
  return res.json(user);
}
