import { z } from "zod";

export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "El título es obligatorio.")
    .max(100, "El título no puede superar 100 caracteres."),
  description: z.string().trim().min(1, "La descripción es obligatoria."),
});

export type TaskFormValues = z.infer<typeof taskSchema>;
