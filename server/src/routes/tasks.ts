import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  uploadTaskPhoto,
  getTaskPhoto,
  deleteTaskPhoto,
} from "../controllers/tasksController";
import { requireAuth } from "../middleware/requireAuth";
import { isPhotoMimeType } from "../services/taskPhoto";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, fields: 0, parts: 1 },
  fileFilter: (_req, file, callback) => callback(null, isPhotoMimeType(file.mimetype)),
}).single("photo");

function parsePhotoUpload(req: Request, res: Response, next: NextFunction) {
  photoUpload(req, res, (error) => {
    if (!error) return next();
    if (!(error instanceof multer.MulterError)) return next(error);
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "La foto supera el máximo de 5 MB" });
    }
    return res.status(400).json({ error: "Archivo de foto no válido" });
  });
}

tasksRouter.get("/", listTasks);
tasksRouter.get("/:id", getTask);
tasksRouter.post("/", createTask);
tasksRouter.put("/:id", updateTask);
tasksRouter.delete("/:id", deleteTask);
tasksRouter.post("/:id/photo", parsePhotoUpload, uploadTaskPhoto);
tasksRouter.get("/:id/photo", getTaskPhoto);
tasksRouter.delete("/:id/photo", deleteTaskPhoto);

