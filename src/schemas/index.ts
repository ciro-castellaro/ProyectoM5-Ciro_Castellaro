import { z } from "zod";

// Limites defensivos: acotan el tamano de los inputs antes de tocar memoria o red.
const MAX_CONTENT_LENGTH = 1_000_000;
const MAX_ISSUE_BODY_LENGTH = 65_536;
const MAX_COMMIT_MESSAGE_LENGTH = 10_000;
const MAX_PAGE = 10_000;

const ownerSchema = z
  .string()
  .min(1, "El owner del repositorio es obligatorio")
  .max(39, "El owner no puede superar los 39 caracteres")
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9-]*$/,
    "El owner solo puede contener letras, numeros y guiones, sin empezar con guion",
  );

const repoNameSchema = z
  .string()
  .min(1, "El nombre del repositorio es obligatorio")
  .max(100, "El nombre del repositorio no puede superar los 100 caracteres")
  .regex(
    /^[A-Za-z0-9._-]+$/,
    "El nombre solo puede contener letras, numeros, puntos, guiones y guiones bajos",
  );

const branchSchema = z
  .string()
  .min(1, "La rama es obligatoria")
  .max(255, "La rama no puede superar los 255 caracteres")
  .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/, "La rama contiene caracteres no permitidos")
  .refine((value) => !value.includes(".."), "La rama no puede contener '..'");

const filePathSchema = z
  .string()
  .min(1, "La ruta del archivo es obligatoria")
  .max(1024, "La ruta del archivo no puede superar los 1024 caracteres")
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.includes("\\") &&
      !value.includes("\0") &&
      value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== ".."),
    "La ruta debe ser relativa, sin segmentos vacios, '.' ni '..'",
  );

export const createRepositorySchema = z.object({
  name: repoNameSchema
    .min(3, "El nombre del repositorio debe tener al menos 3 caracteres")
    .refine((value) => value !== "." && value !== "..", "El nombre del repositorio no es valido"),
  description: z
    .string()
    .max(350, "La descripcion no puede superar los 350 caracteres")
    .optional(),
  private: z.boolean().default(false),
});

export type CreateRepositoryInput = z.infer<typeof createRepositorySchema>;

export const createIssueSchema = z.object({
  owner: ownerSchema,
  repo: repoNameSchema,
  title: z
    .string()
    .min(1, "El titulo del issue es obligatorio")
    .max(256, "El titulo no puede superar los 256 caracteres"),
  body: z
    .string()
    .max(MAX_ISSUE_BODY_LENGTH, "El cuerpo del issue no puede superar los 65536 caracteres")
    .optional(),
  labels: z
    .array(z.string().min(1, "Cada label debe tener al menos 1 caracter").max(50, "Cada label puede tener hasta 50 caracteres"))
    .max(100, "No se pueden enviar mas de 100 labels")
    .optional(),
  assignees: z
    .array(ownerSchema)
    .max(10, "GitHub permite hasta 10 assignees por issue")
    .optional(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

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

export const createCommitSchema = z.object({
  owner: ownerSchema,
  repo: repoNameSchema,
  branch: branchSchema,
  path: filePathSchema,
  content: z
    .string()
    .min(1, "El contenido del archivo es obligatorio")
    .max(MAX_CONTENT_LENGTH, "El contenido no puede superar 1000000 caracteres"),
  message: z
    .string()
    .min(1, "El mensaje del commit es obligatorio")
    .max(MAX_COMMIT_MESSAGE_LENGTH, "El mensaje del commit no puede superar los 10000 caracteres"),
});

export type CreateCommitInput = z.infer<typeof createCommitSchema>;

export const listIssuesSchema = z.object({
  owner: ownerSchema,
  repo: repoNameSchema,
  state: z
    .enum(["open", "closed", "all"], {
      message: "state debe ser uno de: open, closed, all",
    })
    .default("open"),
  labels: z
    .array(z.string().min(1, "Cada label debe tener al menos 1 caracter").max(50, "Cada label puede tener hasta 50 caracteres"))
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
