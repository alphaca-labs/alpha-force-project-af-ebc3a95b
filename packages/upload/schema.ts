// Spec: 007-upload-package
import { z } from "zod";

/** S3/R2 object keys are at most 1024 bytes. */
const MAX_KEY_LENGTH = 1024;
/** SigV4 presigned URLs expire in at most 7 days. */
const MAX_EXPIRES_IN = 604_800;
/** Default presigned URL lifetime: 15 minutes. */
const DEFAULT_EXPIRES_IN = 900;
/** ListObjectsV2 returns at most 1000 keys per page. */
const MAX_LIST_KEYS = 1000;

// Avoid a control-char regex literal (`no-control-regex`); scan code points.
function hasControlChar(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * A safe object key: non-empty, no leading slash, no `..` path segments, no
 * control characters. Prevents path traversal and malformed keys before they
 * reach the bucket.
 */
export const ObjectKeySchema = z
  .string()
  .min(1, "Object key must not be empty.")
  .max(
    MAX_KEY_LENGTH,
    `Object key must be at most ${MAX_KEY_LENGTH} characters.`,
  )
  .refine((key) => !key.startsWith("/"), {
    message: "Object key must not start with '/'.",
  })
  .refine((key) => !key.split("/").includes(".."), {
    message: "Object key must not contain '..' path segments.",
  })
  .refine((key) => !hasControlChar(key), {
    message: "Object key must not contain control characters.",
  });

export const ContentTypeSchema = z.string().min(1).optional();

export const ExpiresInSchema = z
  .number()
  .int()
  .positive()
  .max(MAX_EXPIRES_IN, "Expiry must be at most 604800 seconds (7 days).")
  .default(DEFAULT_EXPIRES_IN);

const MetadataSchema = z.record(z.string(), z.string()).optional();

export const PresignedUploadInputSchema = z.object({
  key: ObjectKeySchema,
  contentType: ContentTypeSchema,
  contentLength: z.number().int().positive().optional(),
  expiresIn: ExpiresInSchema,
  metadata: MetadataSchema,
});

export const PresignedDownloadInputSchema = z.object({
  key: ObjectKeySchema,
  expiresIn: ExpiresInSchema,
  responseContentType: z.string().min(1).optional(),
  responseContentDisposition: z.string().min(1).optional(),
});

export const PutObjectInputSchema = z.object({
  key: ObjectKeySchema,
  contentType: ContentTypeSchema,
  contentLength: z.number().int().positive().optional(),
  metadata: MetadataSchema,
});

export const GetObjectInputSchema = z.object({ key: ObjectKeySchema });

export const DeleteObjectInputSchema = z.object({ key: ObjectKeySchema });

export const ListObjectsInputSchema = z.object({
  prefix: z.string().optional(),
  maxKeys: z
    .number()
    .int()
    .positive()
    .max(MAX_LIST_KEYS)
    .default(MAX_LIST_KEYS),
  continuationToken: z.string().optional(),
});

// Public input types use `z.input` so callers may omit defaulted/optional
// fields; each helper `.parse()`s internally to the resolved (output) shape.
export type PresignedUploadInput = z.input<typeof PresignedUploadInputSchema>;
export type PresignedDownloadInput = z.input<
  typeof PresignedDownloadInputSchema
>;
export type PutObjectInput = z.input<typeof PutObjectInputSchema>;
export type GetObjectInput = z.input<typeof GetObjectInputSchema>;
export type DeleteObjectInput = z.input<typeof DeleteObjectInputSchema>;
export type ListObjectsInput = z.input<typeof ListObjectsInputSchema>;

/**
 * Join + validate path segments into a single object key. Trims each segment,
 * collapses slashes, drops empties, then runs {@link ObjectKeySchema}.
 *
 * @example buildObjectKey("uploads", userId, file.name) // "uploads/42/a.png"
 */
export function buildObjectKey(...segments: string[]): string {
  const key = segments
    .flatMap((segment) => segment.split("/"))
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join("/");

  return ObjectKeySchema.parse(key);
}
