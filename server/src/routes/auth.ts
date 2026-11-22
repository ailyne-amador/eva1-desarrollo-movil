import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { login, logout, me, refresh, register } from "../controllers/authController";
import { requireAuth } from "../middleware/requireAuth";

export const authRouter = Router();

const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Inténtalo de nuevo más tarde." },
});

authRouter.post("/register", authAttemptLimiter, register);
authRouter.post("/login", authAttemptLimiter, login);
authRouter.post("/logout", logout);
authRouter.post("/refresh", authAttemptLimiter, refresh);
authRouter.get("/me", requireAuth, me);
