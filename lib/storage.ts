import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 is S3-compatible — we talk to it via the AWS S3 SDK.
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

export const R2_BUCKET = process.env.R2_BUCKET ?? "";

// Public host serving the bucket (custom domain or *.r2.dev). Used to build image URLs.
const publicHost = process.env.NEXT_PUBLIC_R2_PUBLIC_HOST ?? "";

export const r2 = new S3Client({
  region: "auto",
  endpoint: accountId
    ? `https://${accountId}.r2.cloudflarestorage.com`
    : undefined,
  credentials:
    accessKeyId && secretAccessKey
      ? { accessKeyId, secretAccessKey }
      : undefined,
});

/** True when R2 credentials + bucket are configured (needed for uploads). */
export function isR2Configured(): boolean {
  return !!(accountId && accessKeyId && secretAccessKey && R2_BUCKET);
}

/** Upload raw bytes to R2 and return the stored object key. */
export async function uploadObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

/** Build the public URL for a stored object key. */
export function publicUrl(key: string): string {
  // Pass through absolute URLs and local/public paths (e.g. seeded demo covers).
  if (key.startsWith("http") || key.startsWith("/")) return key;
  // Tolerate NEXT_PUBLIC_R2_PUBLIC_HOST with or without a scheme / trailing slash.
  const host = publicHost.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${host}/${key}`;
}

/**
 * Create a presigned PUT URL so the browser can upload an image directly to R2,
 * keeping large file bytes off our serverless functions.
 */
export async function presignUpload(
  key: string,
  contentType: string,
  expiresIn = 60,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2, command, { expiresIn });
}
