// Spec: 007-upload-package
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getS3Client } from "./client";
import { keys } from "./keys";
import {
  PresignedDownloadInputSchema,
  PresignedUploadInputSchema,
  type PresignedDownloadInput,
  type PresignedUploadInput,
} from "./schema";

export type PresignedUrlResult = {
  /** The signed URL the client uses directly (no credentials needed). */
  url: string;
  key: string;
  method: "PUT" | "GET";
  /** Lifetime in seconds. */
  expiresIn: number;
};

/**
 * Spec: 007-upload-package — presigned PUT upload URL.
 *
 * Issue a short-lived URL the browser can `fetch(url, { method: "PUT", body })`
 * to upload directly to the bucket. The `Content-Type` (and optional
 * `Content-Length`) signed here MUST match the headers the client sends.
 */
export async function createPresignedUploadUrl(
  input: PresignedUploadInput,
): Promise<PresignedUrlResult> {
  const { key, contentType, contentLength, expiresIn, metadata } =
    PresignedUploadInputSchema.parse(input);

  const command = new PutObjectCommand({
    Bucket: keys().S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
    Metadata: metadata,
  });

  const url = await getSignedUrl(getS3Client(), command, { expiresIn });
  return { url, key, method: "PUT", expiresIn };
}

/**
 * Spec: 007-upload-package — presigned GET download URL (private objects).
 *
 * Grant time-boxed read access to a private object. Optionally override the
 * response `Content-Type` / `Content-Disposition` (e.g. force a download with a
 * filename).
 */
export async function createPresignedDownloadUrl(
  input: PresignedDownloadInput,
): Promise<PresignedUrlResult> {
  const { key, expiresIn, responseContentType, responseContentDisposition } =
    PresignedDownloadInputSchema.parse(input);

  const command = new GetObjectCommand({
    Bucket: keys().S3_BUCKET,
    Key: key,
    ResponseContentType: responseContentType,
    ResponseContentDisposition: responseContentDisposition,
  });

  const url = await getSignedUrl(getS3Client(), command, { expiresIn });
  return { url, key, method: "GET", expiresIn };
}
