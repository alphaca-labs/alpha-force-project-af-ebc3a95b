// Spec: 007-upload-package
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type GetObjectCommandOutput,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";

import { getS3Client } from "./client";
import { keys } from "./keys";
import {
  DeleteObjectInputSchema,
  GetObjectInputSchema,
  ListObjectsInputSchema,
  PutObjectInputSchema,
  type DeleteObjectInput,
  type GetObjectInput,
  type ListObjectsInput,
  type PutObjectInput,
} from "./schema";

/** Accepted upload payloads (string / bytes / Node stream). Not zod-validated
 * (would consume a stream) — typed only. */
export type PutObjectBody = NonNullable<PutObjectCommandInput["Body"]>;

export interface PutObjectResult {
  key: string;
  etag?: string;
}

export interface GetObjectResult {
  /** Un-consumed response stream — caller transforms/pipes it. */
  body: GetObjectCommandOutput["Body"];
  contentType?: string;
  contentLength?: number;
  etag?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
}

export interface ListedObject {
  key: string;
  size?: number;
  etag?: string;
  lastModified?: Date;
}

export interface ListObjectsResult {
  objects: ListedObject[];
  isTruncated: boolean;
  /** Pass back as `continuationToken` to fetch the next page. */
  nextContinuationToken?: string;
}

/** Upload an object directly from the server. */
export async function putObject(
  input: PutObjectInput,
  body: PutObjectBody,
): Promise<PutObjectResult> {
  const { key, contentType, contentLength, metadata } =
    PutObjectInputSchema.parse(input);

  const result = await getS3Client().send(
    new PutObjectCommand({
      Bucket: keys().S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: contentLength,
      Metadata: metadata,
    }),
  );

  return { key, etag: result.ETag };
}

/** Fetch an object. `body` is returned un-consumed. */
export async function getObject(
  input: GetObjectInput,
): Promise<GetObjectResult> {
  const { key } = GetObjectInputSchema.parse(input);

  const output = await getS3Client().send(
    new GetObjectCommand({ Bucket: keys().S3_BUCKET, Key: key }),
  );

  return {
    body: output.Body,
    contentType: output.ContentType,
    contentLength: output.ContentLength,
    etag: output.ETag,
    lastModified: output.LastModified,
    metadata: output.Metadata,
  };
}

/** Delete an object. Idempotent (deleting a missing key succeeds). */
export async function deleteObject(input: DeleteObjectInput): Promise<void> {
  const { key } = DeleteObjectInputSchema.parse(input);

  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: keys().S3_BUCKET, Key: key }),
  );
}

/** List objects under a prefix (one page; paginate via `continuationToken`). */
export async function listObjects(
  input: ListObjectsInput = {},
): Promise<ListObjectsResult> {
  const { prefix, maxKeys, continuationToken } =
    ListObjectsInputSchema.parse(input);

  const output = await getS3Client().send(
    new ListObjectsV2Command({
      Bucket: keys().S3_BUCKET,
      Prefix: prefix,
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken,
    }),
  );

  return {
    objects: (output.Contents ?? []).map((object) => ({
      key: object.Key ?? "",
      size: object.Size,
      etag: object.ETag,
      lastModified: object.LastModified,
    })),
    isTruncated: output.IsTruncated ?? false,
    nextContinuationToken: output.NextContinuationToken,
  };
}
