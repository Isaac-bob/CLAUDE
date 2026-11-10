import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "El correo es demasiado largo.")
  .email("Escribe un correo electrónico válido.");

export const passwordSchema = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres.")
  .max(128, "La contraseña es demasiado larga.")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Combina letras y números en la contraseña.");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre (mínimo 2 letras).").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Escribe tu contraseña.").max(128),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export const adminUserUpdateSchema = z
  .object({
    role: z.enum(["USER", "ADMIN"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.isActive !== undefined, "Nada que actualizar.");
