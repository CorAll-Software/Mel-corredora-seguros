import sharp from 'sharp';

// Optimización de imágenes subidas (issue #41). Se verifica el formato real del
// archivo (no el que declara el navegador) y se guarda siempre como WebP, sin
// metadatos (EXIF, ubicación) y con un tamaño razonable para la página.

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const MAX_SIDE = 800;

export type ImageError = 'photo_type' | 'photo_invalid';

export async function toOptimizedWebp(input: Buffer): Promise<{ body: Buffer } | { error: ImageError }> {
  let format: string | undefined;
  try {
    format = (await sharp(input).metadata()).format;
  } catch {
    return { error: 'photo_invalid' };
  }
  if (!format || !ALLOWED_FORMATS.has(format)) {
    return { error: 'photo_type' };
  }
  try {
    const body = await sharp(input)
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return { body };
  } catch {
    return { error: 'photo_invalid' };
  }
}
