import fs from 'fs';
import path from 'path';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export interface StorageResult {
  fileName: string;
  storageKey: string;
  mimeType: string;
  size: number;
}

export class StorageService {
  /**
   * Validates file upload constraints
   */
  static validate(file: { name: string; type: string; size: number }) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(`Invalid file type ${file.type}. Allowed formats: PDF, JPEG, PNG.`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds 5MB limit (current: ${(file.size / (1024 * 1024)).toFixed(2)}MB).`);
    }
  }

  /**
   * Save uploaded buffer to local storage directory
   */
  static async saveLocal(file: {
    name: string;
    type: string;
    buffer: Buffer;
  }): Promise<StorageResult> {
    const uploadDir = path.resolve(process.cwd(), process.env.LOCAL_STORAGE_PATH || 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.name) || '.bin';
    const randomName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`;
    const filePath = path.join(uploadDir, randomName);

    fs.writeFileSync(filePath, file.buffer);

    return {
      fileName: file.name,
      storageKey: randomName,
      mimeType: file.type,
      size: file.buffer.length,
    };
  }

  /**
   * Read file stream or buffer from storage key
   */
  static getLocalFile(storageKey: string): { buffer: Buffer; exists: boolean } {
    const uploadDir = path.resolve(process.cwd(), process.env.LOCAL_STORAGE_PATH || 'uploads');
    // Prevent directory traversal attacks
    const safeKey = path.basename(storageKey);
    const filePath = path.join(uploadDir, safeKey);

    if (!fs.existsSync(filePath)) {
      return { buffer: Buffer.from([]), exists: false };
    }
    return { buffer: fs.readFileSync(filePath), exists: true };
  }
}
