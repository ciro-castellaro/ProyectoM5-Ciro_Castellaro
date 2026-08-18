import { z } from "zod";

// Limites defensivos: acotan el tamano de los inputs antes de tocar memoria o red.
export const MAX_CONTENT_LENGTH = 1_000_000;
export const MAX_ISSUE_BODY_LENGTH = 65_536;
export const MAX_COMMIT_MESSAGE_LENGTH = 10_000;
export const MAX_PAGE = 10_000;

export const ownerSchema = z
  .string()
  .min(1, "El owner del repositorio es obligatorio")
  .max(39, "El owner no puede superar los 39 caracteres")
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9-]*$/,
    "El owner solo puede contener letras, numeros y guiones, sin empezar con guion",
  );

export const repoNameSchema = z
  .string()
  .min(1, "El nombre del repositorio es obligatorio")
  .max(100, "El nombre del repositorio no puede superar los 100 caracteres")
  .regex(
    /^[A-Za-z0-9._-]+$/,
    "El nombre solo puede contener letras, numeros, puntos, guiones y guiones bajos",
  );

export const branchSchema = z
  .string()
  .min(1, "La rama es obligatoria")
  .max(255, "La rama no puede superar los 255 caracteres")
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._/-]*$/,
    "La rama contiene caracteres no permitidos",
  )
  .refine((value) => !value.includes(".."), "La rama no puede contener '..'");

export const filePathSchema = z
  .string()
  .min(1, "La ruta del archivo es obligatoria")
  .max(1024, "La ruta del archivo no puede superar los 1024 caracteres")
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.includes("\\") &&
      !value.includes("\0") &&
      value
        .split("/")
        .every(
          (segment) => segment !== "" && segment !== "." && segment !== "..",
        ),
    "La ruta debe ser relativa, sin segmentos vacios, '.' ni '..'",
  );

export const labelSchema = z
  .string()
  .min(1, "Cada label debe tener al menos 1 caracter")
  .max(50, "Cada label puede tener hasta 50 caracteres");
