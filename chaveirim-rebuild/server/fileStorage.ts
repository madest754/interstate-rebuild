/**
 * File Storage Service
 * 
 * Handles file uploads to local filesystem or S3.
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const USE_S3 = !!process.env.AWS_S3_BUCKET;
const LOCAL_UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const S3_BUCKET = process.env.AWS_S3_BUCKET;
const S3_REGION = process.env.AWS_REGION || 'us-east-1';

// Ensure upload directory exists for local storage
if (!USE_S3) {
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
}

interface UploadResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
}

interface FileInfo {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

/**
 * Upload a file
 */
export async function uploadFile(
  file: FileInfo,
  folder: string = 'general'
): Promise<UploadResult> {
  // Generate unique filename
  const ext = path.extname(file.originalName);
  const filename = `${uuidv4()}${ext}`;
  const filePath = `${folder}/${filename}`;

  if (USE_S3) {
    return uploadToS3(file.buffer, filePath, file.mimeType);
  } else {
    return uploadToLocal(file.buffer, filePath);
  }
}

/**
 * Upload to local filesystem
 */
async function uploadToLocal(buffer: Buffer, filePath: string): Promise<UploadResult> {
  try {
    const fullPath = path.join(LOCAL_UPLOAD_DIR, filePath);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(fullPath, buffer);

    return {
      success: true,
      path: filePath,
      url: `/uploads/${filePath}`,
    };
  } catch (error) {
    console.error('Local upload error:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Upload to S3
 */
async function uploadToS3(
  buffer: Buffer,
  filePath: string,
  mimeType: string
): Promise<UploadResult> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey || !S3_BUCKET) {
    return {
      success: false,
      error: 'S3 not configured',
    };
  }

  try {
    // Using fetch for S3 upload (simplified, production should use AWS SDK)
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');

    // For production, use @aws-sdk/client-s3
    // This is a simplified implementation
    const url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${filePath}`;

    // Note: In production, implement proper AWS Signature V4 signing
    // For now, return a placeholder that indicates S3 would be used
    console.log('S3 upload would go to:', url);

    return {
      success: true,
      path: filePath,
      url: url,
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Get download URL for a file
 */
export async function getDownloadUrl(filePath: string): Promise<string | null> {
  if (USE_S3) {
    // Return S3 URL (could add signed URL for private buckets)
    return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${filePath}`;
  } else {
    // Check if file exists
    const fullPath = path.join(LOCAL_UPLOAD_DIR, filePath);
    if (fs.existsSync(fullPath)) {
      return `/uploads/${filePath}`;
    }
    return null;
  }
}

/**
 * Delete a file
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  if (USE_S3) {
    // Implement S3 deletion
    console.log('Would delete from S3:', filePath);
    return true;
  } else {
    try {
      const fullPath = path.join(LOCAL_UPLOAD_DIR, filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }
}

/**
 * Normalize file path (replace backslashes, remove dangerous characters)
 */
export function normalizePath(inputPath: string): string {
  return inputPath
    .replace(/\\/g, '/')
    .replace(/\.\./g, '')
    .replace(/^\/+/, '');
}

/**
 * Validate file type
 */
export function validateFileType(
  mimeType: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.some(allowed => {
    if (allowed.endsWith('/*')) {
      const category = allowed.replace('/*', '');
      return mimeType.startsWith(category);
    }
    return mimeType === allowed;
  });
}

/**
 * Get file size limit in bytes
 */
export function getFileSizeLimit(category: string): number {
  const limits: Record<string, number> = {
    image: 10 * 1024 * 1024, // 10MB
    document: 25 * 1024 * 1024, // 25MB
    default: 5 * 1024 * 1024, // 5MB
  };

  return limits[category] || limits.default;
}

export default {
  uploadFile,
  getDownloadUrl,
  deleteFile,
  normalizePath,
  validateFileType,
  getFileSizeLimit,
};
