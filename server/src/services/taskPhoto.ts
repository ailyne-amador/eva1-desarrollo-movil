import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const uploadsDirectory = resolve(serverRoot, "uploads");

const photoExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function isPhotoMimeType(mimeType: string): boolean {
  return Object.hasOwn(photoExtensions, mimeType.toLowerCase());
}

function hasValidSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return buffer.length >= pngSignature.length && buffer.subarray(0, pngSignature.length).equals(pngSignature);
  }
  return mimeType === "image/webp" && buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
}

export async function saveTaskPhoto(buffer: Buffer, mimeType: string): Promise<string | null> {
  const normalizedMimeType = mimeType.toLowerCase();
  const extension = photoExtensions[normalizedMimeType];
  if (!extension || !hasValidSignature(buffer, normalizedMimeType)) return null;

  const filename = `${randomUUID()}${extension}`;
  const absolutePath = resolve(uploadsDirectory, filename);
  await mkdir(uploadsDirectory, { recursive: true });
  try {
    await writeFile(absolutePath, buffer, { flag: "wx" });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) {
      await deleteTaskPhoto(`uploads/${filename}`);
    }
    throw error;
  }
  return `uploads/${filename}`;
}

export function resolveTaskPhoto(photoPath: string | null): string | null {
  if (!photoPath?.startsWith("uploads/")) return null;
  const absolutePath = resolve(serverRoot, photoPath);
  const relativePath = relative(uploadsDirectory, absolutePath);
  if (!relativePath || relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    return null;
  }
  return absolutePath;
}

export async function deleteTaskPhoto(photoPath: string | null): Promise<void> {
  const absolutePath = resolveTaskPhoto(photoPath);
  if (!absolutePath) return;
  try {
    await unlink(absolutePath);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
}
