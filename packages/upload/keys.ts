// Spec: 007-upload-package
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Storage (Cloudflare R2 / AWS S3) credentials, validated at runtime.
 *
 * Node-only: there is no `server-only` guard (see spec Non-Goals). Callers MUST
 * invoke this from server code so credentials never reach a client bundle.
 *
 * - R2: set `S3_ENDPOINT` to `https://<accountId>.r2.cloudflarestorage.com`,
 *   keep `S3_REGION=auto`.
 * - AWS S3: leave `S3_ENDPOINT` unset and use a real region (e.g. `us-east-1`).
 */
export const keys = () =>
  createEnv({
    server: {
      // Custom S3-compatible endpoint (R2/MinIO/...). Omit for AWS S3.
      S3_ENDPOINT: z.string().url().optional(),
      // R2 uses "auto"; AWS S3 uses a real region.
      S3_REGION: z.string().min(1).default("auto"),
      S3_ACCESS_KEY_ID: z.string().min(1),
      S3_SECRET_ACCESS_KEY: z.string().min(1),
      S3_BUCKET: z.string().min(1),
      // Optional public/CDN base URL for assembling public object URLs.
      S3_PUBLIC_BASE_URL: z.string().url().optional(),
      // Path-style addressing toggle (R2/MinIO). Defaults to on for custom
      // endpoints in the client factory when unset.
      S3_FORCE_PATH_STYLE: z
        .enum(["true", "false"])
        .transform((value) => value === "true")
        .optional(),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
  });
