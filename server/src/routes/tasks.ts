import { Router } from "express";
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/tasksController";

export const tasksRouter = Router();

tasksRouter.get("/", listTasks);
tasksRouter.get("/:id", getTask);
tasksRouter.post("/", createTask);
tasksRouter.put("/:id", updateTask);
tasksRouter.delete("/:id", deleteTask);
