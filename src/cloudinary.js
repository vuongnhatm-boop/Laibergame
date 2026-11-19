import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || '';
const API_KEY = process.env.CLOUDINARY_API_KEY || '';

export const cloudinaryEnabled = Boolean(CLOUD_NAME && UPLOAD_PRESET && API_KEY);

export async function uploadImage(filePath, originalName = 'image') {
  if (!cloudinaryEnabled) return null;

  try {
    const buffer = await fs.readFile(filePath);
    const form = new FormData();
    form.append('upload_preset', UPLOAD_PRESET);
    form.append('api_key', API_KEY);
    form.append('file', new Blob([buffer]), path.basename(originalName || 'image'));

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.secure_url) {
      console.warn('[cloudinary] upload failed:', data?.error?.message || res.status);
      return null;
    }
    return data.secure_url;
  } catch (err) {
    console.warn('[cloudinary] upload error:', err.message);
    return null;
  }
}
