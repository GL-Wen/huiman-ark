export interface ComicStitchItem {
  src: string;
  title?: string;
  cut?: string;
}

/**
 * Loads an image from a src URL (data URL or standard URL) into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for stitching'));
    img.src = src;
  });
}

/**
 * Stitches multiple comic images vertically into a single seamless Webtoon long strip.
 *
 * @param items Array of comic images to stitch in order
 * @param options Styling options such as targetWidth and vertical gap
 * @returns Blob of the stitched PNG image
 */
export async function stitchComicsToBlob(
  items: ComicStitchItem[],
  options: {
    targetWidth?: number;
    gap?: number;
    backgroundColor?: string;
  } = {},
): Promise<Blob> {
  if (items.length === 0) {
    throw new Error('No images to stitch');
  }

  const { targetWidth = 1200, gap = 16, backgroundColor = '#0f172a' } = options;

  // 1. Load all images in parallel
  const loadedImages = await Promise.all(items.map((item) => loadImage(item.src)));

  // 2. Compute target heights while maintaining aspect ratio
  const layout = loadedImages.map((img) => {
    const scale = targetWidth / img.width;
    const height = Math.round(img.height * scale);
    return { img, height };
  });

  const totalHeight = layout.reduce((acc, curr) => acc + curr.height, 0) + gap * (items.length + 1);

  // 3. Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = totalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire canvas 2D context');
  }

  // 4. Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, targetWidth, totalHeight);

  // 5. Draw each image sequentially
  let currentY = gap;
  for (const { img, height } of layout) {
    ctx.drawImage(img, 0, currentY, targetWidth, height);
    currentY += height + gap;
  }

  // 6. Convert canvas to Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/png');
  });
}
