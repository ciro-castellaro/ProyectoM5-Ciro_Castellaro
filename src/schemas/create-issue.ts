import { z } from "zod";
import {
  ownerSchema,
  repoNameSchema,
  labelSchema,
  MAX_ISSUE_BODY_LENGTH,
} from "./shared.js";

export const createIssueSchema = z.object({
  owner: ownerSchema,
  repo: repoNameSchema,
  milestone: z
    .number()
    .int("El milestone debe ser un numero entero")
    .positive("El milestone debe ser mayor a 0")
    .optional(),

  title: z
    .string()
    .min(1, "El titulo del issue es obligatorio")
    .max(256, "El titulo no puede superar los 256 caracteres"),
  body: z
    .string()
    .max(
      MAX_ISSUE_BODY_LENGTH,
      "El cuerpo del issue no puede superar los 65536 caracteres",
    )
    .optional(),
  labels: z
    .array(labelSchema)
    .max(100, "No se pueden enviar mas de 100 labels")
    .refine(
      (values) => new Set(values).size === values.length,
      "No se pueden enviar labels duplicadas",
    )
    .optional(),
  assignees: z
    .array(ownerSchema)
    .max(10, "GitHub permite hasta 10 assignees por issue")
    .optional(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
