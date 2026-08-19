import { z } from "zod";
import { repoNameSchema } from "./shared.js";

export const createRepositorySchema = z.object({
  name: repoNameSchema
    .min(3, "El nombre del repositorio debe tener al menos 3 caracteres")
    .refine(
      (value) => value !== "." && value !== "..",
      "El nombre del repositorio no es valido",
    ),
  description: z
    .string()
    .max(350, "La descripcion no puede superar los 350 caracteres")
    .refine(
      (value) => value.trim().length > 0,
      "La descripcion no puede estar vacia",
    )
    .optional(),
  private: z.boolean().default(false),
});

export type CreateRepositoryInput = z.infer<typeof createRepositorySchema>;
