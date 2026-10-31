import { z } from "zod";

// Esquema compartido con la app móvil: mismas reglas en ambos lados
export const taskSchema = z.object({
  title: z
    .string("El título es obligatorio")
    .min(1, "El título es obligatorio")
    .max(100, "El título no puede superar 100 caracteres"),
  description: z
    .string("La descripción es obligatoria")
    .min(1, "La descripción es obligatoria"),
});

export type TaskInput = z.infer<typeof taskSchema>;
