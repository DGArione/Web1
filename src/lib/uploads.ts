import "server-only";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

/**
 * Persist an uploaded file (payment receipt / product image) to
 * public/uploads and return its public URL. Dev-only local storage; swap for
 * S3/object storage in production.
 */
export async function saveUpload(file: File): Promise<string> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Unsupported file type. Use PNG, JPG, WEBP, GIF or PDF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File too large (max 5MB).");
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = extForType(file.type);
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`;
}

function extForType(type: string): string {
  switch (type) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "application/pdf":
      return ".pdf";
    default:
      return "";
  }
}
