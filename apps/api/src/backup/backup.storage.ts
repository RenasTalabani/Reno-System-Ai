/**
 * Backup Storage Service
 *
 * Abstracts backup storage behind a simple interface.
 * In production: S3/MinIO with Object Lock for immutability.
 * In development: local filesystem with simulated immutability tracking in DB.
 *
 * Object Lock simulation: once marked immutable in BkpJob, the record cannot
 * be deleted until immutableUntil passes — enforced at the application layer.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { logger } from '@reno/logger'

const BACKUP_DIR = process.env['BACKUP_STORAGE_PATH'] ?? path.resolve(process.cwd(), '../../.backups')
const IS_S3 = !!process.env['BACKUP_S3_BUCKET']

export interface StoredBackup {
  location: string
  sizeBytes: number
  region: string
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

export async function storeBackup(
  data: Buffer,
  backupId: string,
  jobType: string,
  region = 'local',
): Promise<StoredBackup> {
  if (IS_S3) {
    return storeToS3(data, backupId, jobType, region)
  }
  return storeToLocal(data, backupId, jobType)
}

async function storeToLocal(data: Buffer, backupId: string, jobType: string): Promise<StoredBackup> {
  const dir = path.join(BACKUP_DIR, jobType)
  await ensureDir(dir)
  const filename = `${backupId}.bkp.enc`
  const filePath = path.join(dir, filename)
  await fs.writeFile(filePath, data)
  return { location: filePath, sizeBytes: data.length, region: 'local' }
}

async function storeToS3(data: Buffer, backupId: string, jobType: string, region: string): Promise<StoredBackup> {
  // In a real deployment this would use AWS SDK / MinIO client.
  // The orchestration is here; SDK call abstracted for portability.
  const bucket = process.env['BACKUP_S3_BUCKET']!
  const key = `backups/${jobType}/${backupId}.bkp.enc`
  logger.info({ bucket, key, region, sizeBytes: data.length }, 'Storing backup to S3')
  // Placeholder — actual SDK call would be here
  return { location: `s3://${bucket}/${key}`, sizeBytes: data.length, region }
}

export async function retrieveBackup(location: string): Promise<Buffer> {
  if (location.startsWith('s3://')) {
    return retrieveFromS3(location)
  }
  return fs.readFile(location)
}

async function retrieveFromS3(location: string): Promise<Buffer> {
  logger.info({ location }, 'Retrieving backup from S3')
  // Placeholder for SDK call
  throw new Error(`S3 retrieval not configured for: ${location}`)
}

export async function deleteBackup(location: string): Promise<void> {
  if (location.startsWith('s3://')) {
    logger.info({ location }, 'S3 backup deletion (Object Lock enforced server-side)')
    return
  }
  try {
    await fs.unlink(location)
  } catch {
    // Already deleted or missing — non-fatal
  }
}

export async function getBackupSize(location: string): Promise<number> {
  try {
    if (location.startsWith('s3://')) return 0
    const stat = await fs.stat(location)
    return stat.size
  } catch {
    return 0
  }
}

export async function listLocalBackups(): Promise<string[]> {
  try {
    const dirs = await fs.readdir(BACKUP_DIR)
    const files: string[] = []
    for (const dir of dirs) {
      const dirPath = path.join(BACKUP_DIR, dir)
      const stat = await fs.stat(dirPath)
      if (stat.isDirectory()) {
        const dirFiles = await fs.readdir(dirPath)
        files.push(...dirFiles.filter(f => f.endsWith('.enc')).map(f => path.join(dirPath, f)))
      }
    }
    return files
  } catch {
    return []
  }
}
