import fs from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const LOCAL_PUBLIC_DIR = path.resolve("public", "frames");

function s3Configured() {
  return Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID);
}

function getS3Client() {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: "auto",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Uploads a local file to object storage (R2/S3) when configured, otherwise
 * falls back to serving it from a local /public/frames directory — useful
 * for local development without a cloud bucket set up yet.
 */
export async function uploadFrame(localPath: string, key: string): Promise<string> {
  if (s3Configured()) {
    const client = getS3Client();
    const body = await fs.readFile(localPath);
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: "image/png",
      })
    );
    return `${process.env.S3_PUBLIC_BASE_URL}/${key}`;
  }

  const destPath = path.join(LOCAL_PUBLIC_DIR, key);
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.copyFile(localPath, destPath);
  return `/frames/${key}`;
}
