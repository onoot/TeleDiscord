import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Express } from 'express';
import { config } from '../config';

export class R2Storage {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
  }

  async uploadFile(file: Express.Multer.File) {
    const key = `${Date.now()}-${file.originalname}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: config.r2.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      return {
        url: `${config.r2.publicUrl}/${key}`,
        key,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to upload file to R2: ${error.message}`);
      }
      throw new Error('Failed to upload file to R2: Unknown error');
    }
  }

  async deleteFile(key: string) {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: config.r2.bucketName,
          Key: key,
        })
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to delete file from R2: ${error.message}`);
      }
      throw new Error('Failed to delete file from R2: Unknown error');
    }
  }
}

export const r2Storage = new R2Storage(); 