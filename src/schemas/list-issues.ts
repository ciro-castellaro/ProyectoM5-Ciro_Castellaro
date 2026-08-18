import { z } from "zod";
import { ownerSchema, repoNameSchema, labelSchema, MAX_PAGE } from "./shared.js";

export const listIssuesSchema = z.object({
  owner: ownerSchema,
  repo: repoNameSchema,
  state: z
    .enum(["open", "closed", "all"], {
      message: "state debe ser uno de: open, closed, all",
    })
    .default("open"),
  labels: z
    .array(labelSchema)
    .max(100, "No se pueden enviar mas de 100 labels")
    .optional(),
  page: z
    .number()
    .int("La pagina debe ser un numero entero")
    .positive("La pagina debe ser mayor a 0")
    .max(MAX_PAGE, "La pagina no puede superar 10000")
    .default(1),
  perPage: z
    .number()
    .int("per_page debe ser un numero entero")
    .min(1, "per_page debe ser al menos 1")
    .max(100, "per_page no puede superar 100")
    .default(30),
});

export type ListIssuesInput = z.infer<typeof listIssuesSchema>;
