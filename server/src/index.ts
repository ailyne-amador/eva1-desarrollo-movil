import "dotenv/config";
import express from "express";
import cors from "cors";
import { tasksRouter } from "./routes/tasks";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json()); // parsea el body JSON de las peticiones
app.use(cors()); // permite que la app (web/teléfono) llame a la API

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/tasks", tasksRouter);

// Middleware de errores: va último para capturar lo que falle arriba
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  },
);

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
