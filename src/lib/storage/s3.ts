import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageConfigStatus {
  endpointConfigured: boolean;
  credentialsConfigured: boolean;
  bucketConfigured: boolean;
  region: string;
  bucket?: string;
}

export class StorageConfigurationError extends Error {
  constructor(message = "S3-compatible storage is not fully configured.") {
    super(message);
    this.name = "StorageConfigurationError";
  }
}

function getStorageEnv() {
  return {
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || "us-east-2",
    bucket: process.env.S3_BUCKET,
  };
}

export function getStorageConfigStatus(): StorageConfigStatus {
  const env = getStorageEnv();

  return {
    endpointConfigured: Boolean(env.endpoint),
    credentialsConfigured: Boolean(env.accessKeyId && env.secretAccessKey),
    bucketConfigured: Boolean(env.bucket),
    region: env.region,
    bucket: env.bucket,
  };
}

function getRequiredStorageConfig() {
  const env = getStorageEnv();
  if (!env.endpoint || !env.accessKeyId || !env.secretAccessKey || !env.bucket) {
    throw new StorageConfigurationError();
  }

  return {
    endpoint: env.endpoint,
    accessKeyId: env.accessKeyId,
    secretAccessKey: env.secretAccessKey,
    region: env.region,
    bucket: env.bucket,
  };
}

function createS3Client() {
  const config = getRequiredStorageConfig();

  return new S3Client({
    endpoint: config.endpoint,
    forcePathStyle: true,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function createPresignedStorageUrl(input: {
  mode: "upload" | "download";
  key: string;
  contentType?: string;
  expiresIn: number;
}) {
  const config = getRequiredStorageConfig();
  const client = createS3Client();
  const command =
    input.mode === "upload"
      ? new PutObjectCommand({
          Bucket: config.bucket,
          Key: input.key,
          ContentType: input.contentType || "application/octet-stream",
        })
      : new GetObjectCommand({
          Bucket: config.bucket,
          Key: input.key,
        });

  const url = await getSignedUrl(client, command, { expiresIn: input.expiresIn });
  return {
    key: input.key,
    mode: input.mode,
    url,
    expiresAt: new Date(Date.now() + input.expiresIn * 1000).toISOString(),
  };
}

export async function listStorageObjects(input: { prefix?: string; maxKeys: number }) {
  const config = getRequiredStorageConfig();
  const client = createS3Client();
  const result: ListObjectsV2CommandOutput = await client.send(
    new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: input.prefix,
      MaxKeys: input.maxKeys,
    }),
  );

  return {
    bucket: config.bucket,
    prefix: input.prefix ?? "",
    objects:
      result.Contents?.map((item) => ({
        key: item.Key ?? "",
        size: item.Size ?? 0,
        lastModified: item.LastModified?.toISOString() ?? null,
        etag: item.ETag?.replaceAll('"', "") ?? null,
      })).filter((item) => Boolean(item.key)) ?? [],
  };
}

export async function uploadStorageObject(input: { key: string; content: string; contentType: string }) {
  const config = getRequiredStorageConfig();
  const client = createS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
      Body: input.content,
      ContentType: input.contentType,
    }),
  );

  return {
    uploaded: true,
    key: input.key,
    size: Buffer.byteLength(input.content),
  };
}

export async function deleteStorageObject(key: string) {
  const config = getRequiredStorageConfig();
  const client = createS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );

  return { deleted: true, key };
}
