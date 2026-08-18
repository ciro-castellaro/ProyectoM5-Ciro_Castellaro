import { z } from "zod";
import {
  ownerSchema,
  repoNameSchema,
  branchSchema,
  filePathSchema,
  MAX_CONTENT_LENGTH,
  MAX_COMMIT_MESSAGE_LENGTH,
} from "./shared.js";

export const createCommitSchema = z.object({
  owner: ownerSchema,
  repo: repoNameSchema,
  branch: branchSchema,
  path: filePathSchema,
  content: z
    .string()
    .min(1, "El contenido del archivo es obligatorio")
    .max(
      MAX_CONTENT_LENGTH,
      "El contenido no puede superar 1000000 caracteres",
    ),
  message: z
    .string()
    .min(1, "El mensaje del commit es obligatorio")
    .max(
      MAX_COMMIT_MESSAGE_LENGTH,
      "El mensaje del commit no puede superar los 10000 caracteres",
    ),
});

export type CreateCommitInput = z.infer<typeof createCommitSchema>;
