import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CreateBucketCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const BUCKET = process.env.S3_BUCKET_NAME ?? "kbeats-studio";

/** Generate a presigned URL for direct browser-to-S3 upload */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

/** Generate a presigned URL for downloading a private S3 object */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

/** Read and parse a JSON file from S3 */
export async function readJsonFromS3<T>(key: string): Promise<T | null> {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const res = await s3.send(command);
    const body = await res.Body?.transformToString();
    if (!body) return null;
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

/** Write a JSON object to S3 */
export async function writeJsonToS3(key: string, data: unknown): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: "application/json",
  });
  await s3.send(command);
}

/** Check if an S3 object exists */
export async function s3ObjectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** List all keys under a prefix */
export async function listS3Objects(prefix: string): Promise<string[]> {
  const command = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix });
  const res = await s3.send(command);
  return (res.Contents ?? []).map((o) => o.Key ?? "").filter(Boolean);
}

/** Apply (or re-apply) the public-read bucket policy for renders and project assets */
export async function applyBucketPolicy(): Promise<void> {
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicReadProjectAssets",
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: [
          `arn:aws:s3:::${BUCKET}/renders/*`,
          `arn:aws:s3:::${BUCKET}/projects/*`,
        ],
      },
    ],
  };
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: BUCKET,
      Policy: JSON.stringify(policy),
    })
  );
}

/** Create the kbeats-studio bucket with CORS if it doesn't exist (run once during setup) */
export async function ensureBucketExists(): Promise<void> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: "_init" }));
  } catch (err: unknown) {
    const error = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (error.$metadata?.httpStatusCode === 404 || error.name === "NoSuchBucket") {
      // Create bucket
      await s3.send(
        new CreateBucketCommand({
          Bucket: BUCKET,
          ...(process.env.AWS_REGION !== "us-east-1"
            ? {
                CreateBucketConfiguration: {
                  LocationConstraint: process.env.AWS_REGION as never,
                },
              }
            : {}),
        })
      );
    }
  }

  // Set CORS
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })
  );

  // Set bucket policy to allow public read for renders and project assets
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicReadProjectAssets",
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: [
          `arn:aws:s3:::${BUCKET}/renders/*`,
          `arn:aws:s3:::${BUCKET}/projects/*`,
        ],
      },
    ],
  };
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: BUCKET,
      Policy: JSON.stringify(policy),
    })
  );
}
