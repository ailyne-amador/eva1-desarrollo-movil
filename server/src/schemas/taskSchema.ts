import { z } from "zod";

// Valida el body de la API de forma independiente de la app móvil.
const taskFields = {
  title: z
    .string("El título es obligatorio")
    .min(1, "El título es obligatorio")
    .max(100, "El título no puede superar 100 caracteres"),
  description: z.string().trim().nullish().transform((description) => description || null),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
};

const hasValidLocation = ({
  latitude,
  longitude,
}: {
  latitude?: number | null;
  longitude?: number | null;
}) =>
  ((latitude === undefined || latitude === null) &&
    (longitude === undefined || longitude === null)) ||
  (typeof latitude === "number" && typeof longitude === "number");

const locationError = {
  message: "La latitud y longitud deben enviarse juntas.",
  path: ["latitude"],
};

export const taskSchema = z.object(taskFields).refine(hasValidLocation, locationError);

export const createTaskSchema = z
  .object({ ...taskFields, clientId: z.string().uuid().nullable().optional() })
  .refine(hasValidLocation, locationError);

export type TaskInput = z.infer<typeof taskSchema>;
