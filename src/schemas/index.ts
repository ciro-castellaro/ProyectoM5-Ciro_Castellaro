import { z } from "zod";

export const createRepositorySchema = z.object({
  name: z
    .string()
    .min(3, "El nombre del repositorio debe tener al menos 3 caracteres")
    .max(100, "El nombre del repositorio no puede superar los 100 caracteres")
    .regex(
      /^[A-Za-z0-9._-]+$/,
      "El nombre solo puede contener letras, numeros, puntos, guiones y guiones bajos",
    ),
  description: z
    .string()
    .max(350, "La descripcion no puede superar los 350 caracteres")
    .optional(),
  private: z.boolean().default(false),
});

export type CreateRepositoryInput = z.infer<typeof createRepositorySchema>;

export const createIssueSchema = z.object({
  owner: z.string().min(1, "El owner del repositorio es obligatorio"),
  repo: z.string().min(1, "El nombre del repositorio es obligatorio"),
  title: z
    .string()
    .min(1, "El titulo del issue es obligatorio")
    .max(256, "El titulo no puede superar los 256 caracteres"),
  body: z.string().optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

export const listRepositoriesSchema = z.object({
  page: z
    .number()
    .int("La pagina debe ser un numero entero")
    .positive("La pagina debe ser mayor a 0")
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

export const createCommitSchema = z.object({
  owner: z.string().min(1, "El owner del repositorio es obligatorio"),
  repo: z.string().min(1, "El nombre del repositorio es obligatorio"),
  branch: z.string().min(1, "La rama es obligatoria"),
  path: z.string().min(1, "La ruta del archivo es obligatoria"),
  content: z.string().min(1, "El contenido del archivo es obligatorio"),
  message: z.string().min(1, "El mensaje del commit es obligatorio"),
});

export type CreateCommitInput = z.infer<typeof createCommitSchema>;

export const listIssuesSchema = z.object({
  owner: z.string().min(1, "El owner del repositorio es obligatorio"),
  repo: z.string().min(1, "El nombre del repositorio es obligatorio"),
  state: z
    .enum(["open", "closed", "all"], {
      message: "state debe ser uno de: open, closed, all",
    })
    .default("open"),
  labels: z.array(z.string()).optional(),
  page: z
    .number()
    .int("La pagina debe ser un numero entero")
    .positive("La pagina debe ser mayor a 0")
    .default(1),
  perPage: z
    .number()
    .int("per_page debe ser un numero entero")
    .min(1, "per_page debe ser al menos 1")
    .max(100, "per_page no puede superar 100")
    .default(30),
});

export type ListIssuesInput = z.infer<typeof listIssuesSchema>;
