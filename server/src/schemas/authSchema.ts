import { z } from "zod";

export const authSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("El correo no es válido")
    .max(255, "El correo no puede superar 255 caracteres"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(128, "La contraseña no puede superar 128 caracteres"),
});
