import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME!;
const REGION = process.env.S3_REGION!;

export function getS3Url(key: string): string {
  const cdn = process.env.S3_CLOUDFRONT_URL;
  if (cdn) return `${cdn}/${key}`;
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

export async function uploadToS3(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );
  return getS3Url(key);
}

export async function deleteFromS3(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function getPresignedPutUrl(
  key: string,
  mimeType: string,
  expiresInSecs = 300,
  maxBytes?: number
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: mimeType,
    ...(maxBytes !== undefined ? { ContentLength: maxBytes } : {}),
  });
  return getSignedUrl(s3, command, { expiresIn: expiresInSecs });
}

export async function getObjectSize(key: string): Promise<number> {
  const resp = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  return resp.ContentLength ?? 0;
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const resp = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks: Uint8Array[] = [];
  for await (const chunk of resp.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
