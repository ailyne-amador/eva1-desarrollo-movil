import type { RequestHandler } from "express";
import { verifyToken } from "../services/token";

declare global {
  namespace Express {
    interface Request {
      userId: number;
    }
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const match = /^Bearer\s+(\S+)$/i.exec(req.get("authorization") ?? "");
  const session = match ? verifyToken(match[1]) : null;
  if (!session) {
    res.status(401).json({ error: "Token de autenticación inválido o ausente" });
    return;
  }
  req.userId = session.userId;
  next();
};
