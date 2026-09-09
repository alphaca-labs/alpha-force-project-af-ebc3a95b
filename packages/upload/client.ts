// Spec: 007-upload-package
import { S3Client } from "@aws-sdk/client-s3";

import { keys } from "./keys";

let cached: S3Client | undefined;

/**
 * Build a fresh `S3Client` from validated env. Works for both Cloudflare R2
 * (custom endpoint, `region: "auto"`) and AWS S3 (no endpoint, real region).
 *
 * Most callers want {@link getS3Client} (memoized). Use this directly only when
 * you need an isolated client (e.g. a different bucket/credentials in tests).
 */
export function createS3Client(): S3Client {
  const env = keys();
  const isCustomEndpoint = Boolean(env.S3_ENDPOINT);

  return new S3Client({
    region: env.S3_REGION,
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    // Path-style for custom endpoints (R2/MinIO) unless explicitly overridden.
    forcePathStyle: env.S3_FORCE_PATH_STYLE ?? isCustomEndpoint,
    // R2 rejects the SDK's default flexible checksum headers on presigned PUTs
    // (the signed request omits them, the upload sends them -> signature
    // mismatch / 501). Only send/validate checksums when explicitly required.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

/** Memoized singleton client (lazy; env is read on first use). */
export function getS3Client(): S3Client {
  return (cached ??= createS3Client());
}
