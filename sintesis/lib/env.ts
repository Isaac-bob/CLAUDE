import { z } from "zod";

// Validación central de variables de entorno. Falla al arrancar si falta algo crítico.
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  MAX_UPLOAD_MB: z.coerce.number().positive().max(200).default(25),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),
});

export const env = schema.parse(process.env);
export const MAX_UPLOAD_BYTES = env.MAX_UPLOAD_MB * 1024 * 1024;
