# @repo/upload

Server-only file upload/download utilities for **Cloudflare R2** (primary) and
**AWS S3** (same code path), built on the AWS SDK v3.

The core feature is **presigned URLs**: your server issues a short-lived signed
URL so the browser uploads/downloads **directly** to storage without ever seeing
your credentials. Two axes are provided:

- **Presigned PUT upload** — client `fetch(url, { method: "PUT", body })`.
- **Presigned GET download** for **private** objects — time-boxed read access.

Plus direct server-side helpers (`putObject` / `getObject` / `deleteObject` /
`listObjects`) and Zod input schemas.

> **Node-only, no `server-only` guard.** Like `@repo/database/node`, this package
> is plain raw TypeScript with no build step — the consumer bundles it. There is
> intentionally **no** RSC `server-only` guard, so you MUST call it from server
> code (route handlers, server actions, API services, workers). Never import it
> into a client component — that would leak credentials into the browser bundle.

## Install

It is a workspace package. Add it to the consuming app:

```jsonc
// apps/<app>/package.json
{ "dependencies": { "@repo/upload": "workspace:*" } }
```

```ts
import {
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  putObject,
  getObject,
  deleteObject,
  listObjects,
  buildObjectKey,
} from "@repo/upload";
```

## Environment variables

Validated at runtime via `@t3-oss/env-core` (fail-fast on first use — a missing
required var throws). Copy `.env.example` and fill it in.

| Variable               | Required  | Description                                                                            |
| ---------------------- | --------- | -------------------------------------------------------------------------------------- |
| `S3_ACCESS_KEY_ID`     | ✅        | Access key id.                                                                         |
| `S3_SECRET_ACCESS_KEY` | ✅        | Secret access key.                                                                     |
| `S3_BUCKET`            | ✅        | Bucket name.                                                                           |
| `S3_ENDPOINT`          | R2/custom | Full S3-compatible endpoint URL. **Set for R2/MinIO; omit for AWS S3.**                |
| `S3_REGION`            | optional  | Defaults to `"auto"` (correct for R2). For AWS S3 use a real region, e.g. `us-east-1`. |
| `S3_PUBLIC_BASE_URL`   | optional  | Public/CDN base URL for assembling public object URLs (public buckets only).           |
| `S3_FORCE_PATH_STYLE`  | optional  | `"true"` / `"false"`. Defaults to **on** for custom endpoints (R2/MinIO) when unset.   |

### Cloudflare R2 (primary)

R2 has no regions, so keep `S3_REGION=auto`. The endpoint is derived from your
**R2 account id**:

```
S3_ENDPOINT = https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

Find `<ACCOUNT_ID>` in the Cloudflare dashboard (R2 → Overview → "Account ID",
or the host shown in your bucket's S3 API URL). Create an R2 **API token**
(scoped to the bucket) for `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`.

```bash
S3_ENDPOINT="https://abc123def456.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_ACCESS_KEY_ID="<r2 access key id>"
S3_SECRET_ACCESS_KEY="<r2 secret access key>"
S3_BUCKET="my-bucket"
```

> **R2 + checksums (important):** recent AWS SDK versions add flexible checksum
> headers by default, which break R2 presigned PUTs (signature mismatch /
> `501 Not Implemented`). The client factory pins `requestChecksumCalculation`
> and `responseChecksumValidation` to `WHEN_REQUIRED` to avoid this — keep it.

### AWS S3

Leave `S3_ENDPOINT` empty (the SDK uses the standard regional endpoint) and set a
real region:

```bash
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="<aws access key id>"
S3_SECRET_ACCESS_KEY="<aws secret access key>"
S3_BUCKET="my-bucket"
# S3_ENDPOINT intentionally unset
```

## Usage

### 1. Presigned upload (recommended for browser uploads)

**Server** — issue the URL (e.g. a server action / route handler):

```ts
import { buildObjectKey, createPresignedUploadUrl } from "@repo/upload";

export async function getUploadUrl(userId: string, fileName: string) {
  const key = buildObjectKey("uploads", userId, fileName); // "uploads/42/a.png"
  return createPresignedUploadUrl({
    key,
    contentType: "image/png",
    expiresIn: 600, // seconds (default 900, max 604800)
  });
  // -> { url, key, method: "PUT", expiresIn }
}
```

**Client** — upload directly to storage with the returned URL:

```ts
// `file` is a File/Blob from an <input type="file">
const { url, key } = await getUploadUrl(userId, file.name);

await fetch(url, {
  method: "PUT",
  // Content-Type MUST match what was signed on the server.
  headers: { "Content-Type": "image/png" },
  body: file,
});
// Persist `key` (e.g. in your DB) to reference the object later.
```

> The bucket must allow `PUT` from your web origin via **CORS** (configure on the
> bucket; not handled by this package). Allowed methods `PUT`/`GET`, your origin,
> and headers `Content-Type` are typically enough.

### 2. Presigned download — private objects

Keep the bucket **private** and hand out expiring read URLs on demand:

```ts
import { createPresignedDownloadUrl } from "@repo/upload";

const { url } = await createPresignedDownloadUrl({
  key: "uploads/42/a.png",
  expiresIn: 300, // 5-minute link
  // Optional: force a download with a filename
  responseContentDisposition: 'attachment; filename="photo.png"',
});
```

**Client** — fetch or navigate to the URL:

```ts
const res = await fetch(url); // GET, no credentials needed
const blob = await res.blob();
// or: window.location.href = url  (browser downloads it directly)
```

### 3. Direct server-side helpers

```ts
import { putObject, getObject, deleteObject, listObjects } from "@repo/upload";

// Upload from the server (body: string | Buffer | Uint8Array | Node stream)
await putObject(
  { key: "reports/2026.csv", contentType: "text/csv" },
  csvBuffer,
);

// Read — `body` is an UN-consumed stream; pipe/transform it yourself
const { body, contentType } = await getObject({ key: "reports/2026.csv" });

// Delete (idempotent)
await deleteObject({ key: "reports/2026.csv" });

// List one page under a prefix (paginate with the returned token)
const page = await listObjects({ prefix: "reports/", maxKeys: 100 });
// -> { objects: [{ key, size, etag, lastModified }], isTruncated, nextContinuationToken }
if (page.isTruncated) {
  await listObjects({
    prefix: "reports/",
    continuationToken: page.nextContinuationToken,
  });
}
```

## Security guidance

- **Private buckets are the default posture.** Don't make buckets public unless
  the content is genuinely public; use presigned GET for everything else.
- **Issue presigned URLs from server code only.** Never expose credentials or
  call these helpers from a client component / browser bundle.
- **Keep `expiresIn` short** — minutes, not days. Default is 900s; the SigV4 hard
  cap is 604800s (7 days).
- **Validate keys.** All inputs run through `ObjectKeySchema` (rejects empty
  keys, leading `/`, `..` path segments, control chars). Build keys server-side
  with `buildObjectKey(...)` rather than trusting raw client paths, and namespace
  by owner (e.g. `uploads/<userId>/...`) so one user can't read another's files.
- **Scope credentials.** Prefer bucket-scoped R2 API tokens / least-privilege IAM
  policies over account-wide keys.
- **Never log presigned URLs or raw credentials.** A presigned URL is a bearer
  credential — anyone who reads it gains access until it expires. Redact `url`
  before passing it to your logger.

## Consuming from a plain-Node app (bundling note)

This package ships **raw TypeScript** and its `@aws-sdk/*` deps are hoisted under
`packages/upload` in pnpm's isolated layout — exactly like `@repo/database` and
Prisma (see root `CLAUDE.md` → "Database Access").

- **Next.js apps (web/admin) server code:** nothing to do — the Next bundler
  handles the workspace TS.
- **Plain-Node `tsup` consumers (e.g. `apps/api` Fastify):** add the AWS SDK
  and its `@smithy`/`@aws-crypto` transitives to `noExternal`. Both families
  are hoisted under `packages/upload` in pnpm's isolated layout and are not
  linked in the consuming app — listing only the top-level SDK packages leaves
  their `require()` calls dangling (runtime `MODULE_NOT_FOUND`). Use regex
  patterns to cover all packages in each family at once (same approach
  `apps/api` uses for `@prisma/`, `@prisma/adapter-pg`, and `pg`):

  ```ts
  // tsup.config.ts
  export default defineConfig({
    // ...
    noExternal: [/^@repo\//, /^@aws-sdk\//, /^@smithy\//, /^@aws-crypto\//],
  });
  ```

## Manual smoke test

No automated test ships here (real R2/S3 credentials and network are required).
To verify against a real bucket:

1. Copy `.env.example` to the consuming app's env and fill in real R2/S3 values.
2. Round-trip a presigned upload + download from a Node script (run it from an app
   that loads the env, e.g. `apps/api`):

   ```ts
   import {
     createPresignedUploadUrl,
     createPresignedDownloadUrl,
   } from "@repo/upload";

   const up = await createPresignedUploadUrl({
     key: "smoke/hello.txt",
     contentType: "text/plain",
   });
   await fetch(up.url, {
     method: "PUT",
     headers: { "Content-Type": "text/plain" },
     body: "hello",
   });

   const down = await createPresignedDownloadUrl({
     key: "smoke/hello.txt",
     expiresIn: 120,
   });
   console.log(await (await fetch(down.url)).text()); // -> "hello"
   ```

3. (No-network check) The signed URL should contain `X-Amz-Signature`,
   `X-Amz-Expires`, and `X-Amz-Credential` query params — inspect `up.url`.
4. Clean up: `await deleteObject({ key: "smoke/hello.txt" })`.

## Scope

In: presigned PUT/GET, direct put/get/delete/list, Zod schemas, env validation.
Out (by design): React hooks/components, multipart upload, DB persistence, bucket
provisioning/CORS/lifecycle (infra), and image transforms.
