import sharp from "sharp";

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 82;

export type OptimizedImageResult = {
  buffer: Buffer;
  contentType: string;
  ext: string;
};

/**
 * Resize wide/tall photos, strip EXIF via rotate(), re-encode for smaller files.
 * Multi-frame GIFs are left unchanged. PNG with alpha stays PNG; other raster → WebP.
 */
export async function optimizeBlogImageBuffer(input: Buffer): Promise<OptimizedImageResult> {
  const probe = await sharp(input, { animated: true, failOn: "none" }).metadata();

  if (probe.format === "gif" && (probe.pages ?? 1) > 1) {
    return { buffer: input, contentType: "image/gif", ext: ".gif" };
  }

  let pipeline = sharp(input, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();

  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
    pipeline = sharp(input, { failOn: "none" })
      .rotate()
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true });
  }

  if (meta.format === "png" && meta.hasAlpha) {
    const buffer = await pipeline.png({ compressionLevel: 9, effort: 10 }).toBuffer();
    return { buffer, contentType: "image/png", ext: ".png" };
  }

  const buffer = await pipeline.webp({ quality: WEBP_QUALITY, effort: 4 }).toBuffer();
  return { buffer, contentType: "image/webp", ext: ".webp" };
}
