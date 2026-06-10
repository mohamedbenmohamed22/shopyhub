import { Injectable, Logger } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * Thin wrapper over the S3-compatible object store (MinIO).
 *
 * Endpoint env semantics:
 *   - S3_ENDPOINT / S3_PORT  → where the API process reaches MinIO.
 *       host-run API  → localhost:9090   |   API in compose → minio:9000
 *   - S3_PUBLIC_URL          → browser-reachable base URL stored in links.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger('Storage');
  private readonly client: S3Client;
  private readonly bucket = process.env.S3_BUCKET ?? 'product-images';
  private readonly publicBase =
    process.env.S3_PUBLIC_URL ??
    `http://localhost:${process.env.MINIO_API_PORT ?? '9090'}/${this.bucket}`;

  constructor() {
    const region = process.env.S3_REGION ?? 'us-east-1';
    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;

    // When S3_ENDPOINT is set we're talking to MinIO (custom endpoint, path-style).
    // When it's absent we're on real AWS S3: let the SDK derive the endpoint and,
    // if no static keys are supplied, fall back to the default credential provider
    // chain (e.g. the EC2 instance role) instead of hard-coded MinIO creds.
    const host = process.env.S3_ENDPOINT;
    const usingMinio = Boolean(host);

    this.client = new S3Client({
      region,
      ...(usingMinio
        ? {
            endpoint: `${process.env.S3_USE_SSL === 'true' ? 'https' : 'http'}://${host}:${
              process.env.S3_PORT ?? '9090'
            }`,
            forcePathStyle: true,
          }
        : {}),
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }

  /** Upload an object and return its public URL. */
  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
    const url = `${this.publicBase}/${key}`;
    this.logger.log(`uploaded ${key} (${body.length} bytes) → ${url}`);
    return url;
  }
}
