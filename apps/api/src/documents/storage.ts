import { Client as MinioClient } from 'minio'
import crypto from 'node:crypto'

export interface UploadResult {
  key: string
  size: number
  etag?: string
}

export interface IStorageProvider {
  getUploadUrl(key: string, mimeType: string, expiresIn?: number): Promise<string>
  getDownloadUrl(key: string, expiresIn?: number): Promise<string>
  deleteObject(key: string): Promise<void>
  putObject(key: string, buffer: Buffer, mimeType: string): Promise<UploadResult>
}

class MinioStorageProvider implements IStorageProvider {
  private client: MinioClient
  private bucket: string

  constructor() {
    this.bucket = process.env.MINIO_BUCKET ?? 'reno-docs'
    this.client = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    })
  }

  private async ensureBucket(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket)
      if (!exists) await this.client.makeBucket(this.bucket, 'us-east-1')
    } catch {
      // MinIO not available — swallow for non-critical paths
    }
  }

  async getUploadUrl(key: string, _mimeType: string, expiresIn = 3600): Promise<string> {
    await this.ensureBucket()
    return this.client.presignedPutObject(this.bucket, key, expiresIn)
  }

  async getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expiresIn)
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, key)
    } catch {
      // Best-effort delete
    }
  }

  async putObject(key: string, buffer: Buffer, mimeType: string): Promise<UploadResult> {
    await this.ensureBucket()
    const result = await this.client.putObject(this.bucket, key, buffer, buffer.length, { 'Content-Type': mimeType })
    return { key, size: buffer.length, etag: result.etag }
  }
}

let _provider: IStorageProvider | null = null

export function getStorageProvider(): IStorageProvider {
  if (!_provider) {
    const type = process.env.STORAGE_PROVIDER ?? 'minio'
    switch (type) {
      default:
        _provider = new MinioStorageProvider()
    }
  }
  return _provider
}

export function buildStorageKey(tenantId: string, fileId: string, fileName: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${tenantId}/${year}/${month}/${fileId}/${safe}`
}

export function generateFileId(): string {
  return crypto.randomUUID()
}
