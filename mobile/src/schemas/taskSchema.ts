import { z } from "zod";

export const taskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "El título es obligatorio.")
      .max(100, "El título no puede superar 100 caracteres."),
    description: z.string().trim().optional().default(""),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    locationName: z.string().trim().max(255).nullable().optional(),
    clientId: z.string().uuid().nullable().optional(),
  })
  .refine(
    ({ latitude, longitude }) =>
      ((latitude === undefined || latitude === null) &&
        (longitude === undefined || longitude === null)) ||
      (typeof latitude === "number" && typeof longitude === "number"),
    {
      message: "La latitud y longitud deben enviarse juntas.",
      path: ["latitude"],
    },
  );

export type TaskFormValues = z.infer<typeof taskSchema>;
