import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "crypto";
import { Request } from "express";
import { env } from "../config/env";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "../config/constants";
import { sendBadRequest } from "../utils/response";
import { Response } from "express";

// ─── Storage Configuration ─────────────────────────────

function createStorage(): multer.StorageEngine {
  if (env.STORAGE_TYPE === "local") {
    return multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, env.STORAGE_PATH);
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `${uuidv4()}${ext}`;
        cb(null, filename);
      },
    });
  }

  // S3 storage - handled by a separate service
  // For now, use memory storage; S3 upload happens in the service layer
  return multer.memoryStorage();
}

// ─── File Filter ───────────────────────────────────────

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
    cb(null, true);
  } else {
    cb(new Error(`File type '${file.mimetype}' is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`));
  }
}

// ─── Upload Instance ───────────────────────────────────

export const upload = multer({
  storage: createStorage(),
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE || MAX_FILE_SIZE,
  },
});

// ─── Upload Middleware Factory ─────────────────────────

export function uploadSingle(fieldName: string) {
  return (req: Request, res: Response, next: (err?: unknown) => void): void => {
    upload.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          sendBadRequest(res, "File size exceeds the 10MB limit");
          return;
        }
        sendBadRequest(res, `Upload error: ${err.message}`);
        return;
      }
      if (err) {
        sendBadRequest(res, err instanceof Error ? err.message : "Upload failed");
        return;
      }
      next();
    });
  };
}

export function uploadMultiple(fieldName: string, maxCount = 5) {
  return (req: Request, res: Response, next: (err?: unknown) => void): void => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          sendBadRequest(res, "File size exceeds the 10MB limit");
          return;
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          sendBadRequest(res, `Too many files. Maximum is ${maxCount}`);
          return;
        }
        sendBadRequest(res, `Upload error: ${err.message}`);
        return;
      }
      if (err) {
        sendBadRequest(res, err instanceof Error ? err.message : "Upload failed");
        return;
      }
      next();
    });
  };
}

// ─── Helper: Get File URL ──────────────────────────────

export function getFileUrl(filename: string): string {
  if (env.STORAGE_TYPE === "s3") {
    return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${filename}`;
  }
  return `${env.APP_URL}/uploads/${filename}`;
}

// ─── Helper: Validate MIME Type ────────────────────────

export function isAllowedFileType(mimeType: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}
