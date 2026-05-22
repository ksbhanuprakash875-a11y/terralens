/**
 * Client-side PSNR and SSIM computation using canvas pixel data.
 * Compares original vs enhanced images by downscaling the enhanced
 * image to match the original's dimensions.
 */

/** Fetch an external URL as a data URL to bypass CORS tainted-canvas errors */
async function fetchAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  // Convert external URLs to data URLs to avoid tainted canvas
  let safeSrc = src;
  if (src.startsWith("http://") || src.startsWith("https://")) {
    safeSrc = await fetchAsDataUrl(src);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for metrics"));
    img.src = safeSrc;
  });
}

function getPixels(img: HTMLImageElement, width: number, height: number): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height).data;
}

/** Convert RGBA pixel array to grayscale float array (luminance) */
function toGrayscale(data: Uint8ClampedArray): Float64Array {
  const len = data.length / 4;
  const gray = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    const off = i * 4;
    gray[i] = 0.299 * data[off] + 0.587 * data[off + 1] + 0.114 * data[off + 2];
  }
  return gray;
}

/**
 * Compute PSNR between two images.
 * Enhanced image is downscaled to original dimensions for comparison.
 */
export async function computePSNR(originalSrc: string, enhancedSrc: string): Promise<number> {
  try {
    const [origImg, enhImg] = await Promise.all([loadImage(originalSrc), loadImage(enhancedSrc)]);
    const w = origImg.naturalWidth;
    const h = origImg.naturalHeight;

    const origData = getPixels(origImg, w, h);
    const enhData = getPixels(enhImg, w, h);

    let mse = 0;
    const pixelCount = w * h;

    for (let i = 0; i < pixelCount; i++) {
      const off = i * 4;
      for (let c = 0; c < 3; c++) {
        const diff = origData[off + c] - enhData[off + c];
        mse += diff * diff;
      }
    }

    mse /= pixelCount * 3;
    if (mse === 0) return 100; // identical images

    const psnr = 10 * Math.log10((255 * 255) / mse);
    return +psnr.toFixed(2);
  } catch (e) {
    console.warn("[imageMetrics] PSNR computation failed:", e);
    return 0;
  }
}

/**
 * Compute SSIM between two images using the standard formula.
 * Uses grayscale luminance, 8×8 sliding window approach.
 */
export async function computeSSIM(originalSrc: string, enhancedSrc: string): Promise<number> {
  try {
    const [origImg, enhImg] = await Promise.all([loadImage(originalSrc), loadImage(enhancedSrc)]);
    const w = origImg.naturalWidth;
    const h = origImg.naturalHeight;

    const maxDim = 1000;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const sw = Math.round(w * scale);
    const sh = Math.round(h * scale);

    const origGray = toGrayscale(getPixels(origImg, sw, sh));
    const enhGray = toGrayscale(getPixels(enhImg, sw, sh));

    const L = 255;
    const k1 = 0.01;
    const k2 = 0.03;
    const C1 = (k1 * L) ** 2;
    const C2 = (k2 * L) ** 2;

    const windowSize = 8;
    let ssimSum = 0;
    let windowCount = 0;

    for (let y = 0; y <= sh - windowSize; y += windowSize) {
      for (let x = 0; x <= sw - windowSize; x += windowSize) {
        let sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0;
        const n = windowSize * windowSize;

        for (let wy = 0; wy < windowSize; wy++) {
          for (let wx = 0; wx < windowSize; wx++) {
            const idx = (y + wy) * sw + (x + wx);
            const xVal = origGray[idx];
            const yVal = enhGray[idx];
            sumX += xVal;
            sumY += yVal;
            sumXX += xVal * xVal;
            sumYY += yVal * yVal;
            sumXY += xVal * yVal;
          }
        }

        const muX = sumX / n;
        const muY = sumY / n;
        const sigmaXX = sumXX / n - muX * muX;
        const sigmaYY = sumYY / n - muY * muY;
        const sigmaXY = sumXY / n - muX * muY;

        const numerator = (2 * muX * muY + C1) * (2 * sigmaXY + C2);
        const denominator = (muX * muX + muY * muY + C1) * (sigmaXX + sigmaYY + C2);

        ssimSum += numerator / denominator;
        windowCount++;
      }
    }

    if (windowCount === 0) return 0;
    const ssim = ssimSum / windowCount;
    return +Math.max(0, Math.min(1, ssim)).toFixed(4);
  } catch (e) {
    console.warn("[imageMetrics] SSIM computation failed:", e);
    return 0;
  }
}

/**
 * Compute both PSNR and SSIM in parallel.
 */
export async function computeMetrics(
  originalSrc: string,
  enhancedSrc: string
): Promise<{ psnr: number; ssim: number }> {
  const [psnr, ssim] = await Promise.all([
    computePSNR(originalSrc, enhancedSrc),
    computeSSIM(originalSrc, enhancedSrc),
  ]);
  return { psnr, ssim };
}
