/**
 * Client-side image compression using Canvas API
 */

export interface CompressionOptions {
  /** Maximum width in pixels (default: 1920) */
  maxWidth?: number;
  /** Maximum height in pixels (default: 1920) */
  maxHeight?: number;
  /** Quality 0-1 (default: 0.85) */
  quality?: number;
  /** Output format (default: "webp") */
  outputFormat?: "webp" | "jpeg" | "png";
  /** Maximum file size in bytes. If exceeded, quality will be progressively reduced */
  maxSizeBytes?: number;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  outputFormat: "webp",
  maxSizeBytes: 0, // 0 means no limit
};

/**
 * Load image from file
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

/**
 * Compress image using Canvas API
 */
async function compressWithCanvas(
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
  format: string
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Use better quality interpolation
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas toBlob failed"));
        }
      },
      `image/${format}`,
      quality
    );
  });
}

/**
 * Compress an image file
 *
 * @example
 * const result = await compressImage(file, { maxWidth: 1200, quality: 0.8 });
 * console.log(`Compressed from ${result.originalSize} to ${result.compressedSize}`);
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip compression for small files (< 100KB) and non-images
  if (file.size < 100 * 1024 || !file.type.startsWith("image/")) {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 1,
      width: 0,
      height: 0,
    };
  }

  // Skip GIFs (animated) and SVGs
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 1,
      width: 0,
      height: 0,
    };
  }

  const img = await loadImage(file);
  const originalUrl = img.src;

  try {
    const { width, height } = calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      opts.maxWidth,
      opts.maxHeight
    );

    let quality = opts.quality;
    let blob = await compressWithCanvas(img, width, height, quality, opts.outputFormat);

    // Progressive quality reduction if maxSizeBytes is set
    if (opts.maxSizeBytes > 0) {
      while (blob.size > opts.maxSizeBytes && quality > 0.3) {
        quality -= 0.1;
        blob = await compressWithCanvas(img, width, height, quality, opts.outputFormat);
      }
    }

    // If compressed is larger than original, return original
    if (blob.size >= file.size) {
      return {
        file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 1,
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
    }

    const extension = opts.outputFormat === "jpeg" ? "jpg" : opts.outputFormat;
    const fileName = file.name.replace(/\.[^/.]+$/, `.${extension}`);

    const compressedFile = new File([blob], fileName, {
      type: `image/${opts.outputFormat}`,
      lastModified: Date.now(),
    });

    return {
      file: compressedFile,
      originalSize: file.size,
      compressedSize: blob.size,
      compressionRatio: blob.size / file.size,
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(originalUrl);
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
