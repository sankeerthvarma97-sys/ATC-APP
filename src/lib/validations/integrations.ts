import { z } from "zod";

const objectKeySchema = z
  .string()
  .trim()
  .min(3)
  .max(512)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._!/*'() -]*$/, "Use a relative object key without a leading slash.")
  .refine((value) => !value.includes(".."), "Object keys cannot contain parent directory traversal.");

export const storagePresignSchema = z.object({
  mode: z.enum(["upload", "download"]).default("upload"),
  key: objectKeySchema,
  contentType: z.string().trim().min(3).max(160).optional(),
  expiresIn: z.coerce.number().int().min(60).max(3600).default(900),
});

export const storageListSchema = z.object({
  prefix: z.string().trim().max(256).optional(),
  maxKeys: z.coerce.number().int().min(1).max(100).default(25),
});

export const storageDeleteSchema = z.object({
  key: objectKeySchema,
});

const ALLOWED_STORAGE_MIME_TYPES = [
  "application/json",
  "text/plain",
  "text/csv",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const storageUploadSchema = z.object({
  key: objectKeySchema,
  contentType: z.enum(ALLOWED_STORAGE_MIME_TYPES).default("application/json"),
  content: z.string().min(1).max(1_000_000),
});

export const emailSendSchema = z
  .object({
    to: z.email(),
    subject: z.string().trim().min(3).max(160),
    html: z.string().trim().min(1).max(12000).optional(),
    text: z.string().trim().min(1).max(6000).optional(),
    from: z.email().optional(),
  })
  .refine((value) => value.html || value.text, {
    message: "Provide html or text content.",
    path: ["html"],
  });
