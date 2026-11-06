// A rectangle in the image's own pixels
export type Box = { x: number; y: number; w: number; h: number };

export async function loadImage(file: File) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
  return { img, url };
}

// Pixelates each box and re-saves the image as JPEG.
// Re-saving through a canvas also removes hidden metadata such as GPS (EXIF).
export function redactImage(img: HTMLImageElement, boxes: Box[], maxSize = 2000): Promise<Blob> {
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas is not supported in this browser.'));
  ctx.drawImage(img, 0, 0, width, height);

  for (const b of boxes) {
    const x = Math.max(0, Math.round(b.x * scale));
    const y = Math.max(0, Math.round(b.y * scale));
    const w = Math.min(width - x, Math.round(b.w * scale));
    const h = Math.min(height - y, Math.round(b.h * scale));
    if (w < 2 || h < 2) continue;

    // About 5 blocks across the short side: strong enough that faces and plates cannot be read
    const block = Math.max(6, Math.round(Math.min(w, h) / 5));
    const small = document.createElement('canvas');
    small.width = Math.max(1, Math.ceil(w / block));
    small.height = Math.max(1, Math.ceil(h / block));
    const sctx = small.getContext('2d');
    if (!sctx) continue;

    sctx.drawImage(canvas, x, y, w, h, 0, 0, small.width, small.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, small.width, small.height, x, y, w, h);
    ctx.imageSmoothingEnabled = true;
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not create the image.'))),
      'image/jpeg',
      0.85
    )
  );
}