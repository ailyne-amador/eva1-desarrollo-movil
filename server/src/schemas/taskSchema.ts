import { z } from "zod";

// Valida el body de la API de forma independiente de la app móvil.
export const taskSchema = z.object({
  title: z
    .string("El título es obligatorio")
    .min(1, "El título es obligatorio")
    .max(100, "El título no puede superar 100 caracteres"),
  description: z.string().trim().nullish().transform((description) => description || null),
});

export type TaskInput = z.infer<typeof taskSchema>;
