import { z } from "zod";
import { MAX_PAGE } from "./shared.js";

export const listRepositoriesSchema = z.object({
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
  sort: z
    .enum(["created", "updated", "pushed", "full_name"], {
      message: "sort debe ser uno de: created, updated, pushed, full_name",
    })
    .default("updated"),
  direction: z
    .enum(["asc", "desc"], { message: "direction debe ser asc o desc" })
    .default("desc"),
  type: z
    .enum(["all", "owner", "member"], {
      message: "type debe ser uno de: all, owner, member",
    })
    .default("owner"),
});

export type ListRepositoriesInput = z.infer<typeof listRepositoriesSchema>;
