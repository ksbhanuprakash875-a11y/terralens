import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode as decodePng } from "https://deno.land/x/pngs@0.1.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Decode a PNG image URL to raw RGBA pixel data.
 * Ensures output is always 4 channels (RGBA).
 */
async function fetchImagePixels(
  url: string
): Promise<{ width: number; height: number; data: Uint8Array }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

  const buffer = new Uint8Array(await response.arrayBuffer());

  // Check if PNG (magic bytes: 137 80 78 71)
  const isPng =
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;

  if (!isPng) {
    throw new Error("Only PNG format is supported for ground-truth metrics computation");
  }

  const decoded = decodePng(buffer);
  const w = decoded.width;
  const h = decoded.height;
  const raw = decoded.image;

  // Determine channels from data length
  const totalPixels = w * h;
  const channels = raw.length / totalPixels;

  console.log(`[ground-truth-metrics] Decoded PNG: ${w}x${h}, ${channels} channels, ${raw.length} bytes`);

  if (channels === 4) {
    return { width: w, height: h, data: raw };
  }

  // Convert to RGBA if needed
  const rgba = new Uint8Array(totalPixels * 4);
  if (channels === 3) {
    for (let i = 0; i < totalPixels; i++) {
      rgba[i * 4] = raw[i * 3];
      rgba[i * 4 + 1] = raw[i * 3 + 1];
      rgba[i * 4 + 2] = raw[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    }
  } else if (channels === 1) {
    for (let i = 0; i < totalPixels; i++) {
      rgba[i * 4] = raw[i];
      rgba[i * 4 + 1] = raw[i];
      rgba[i * 4 + 2] = raw[i];
      rgba[i * 4 + 3] = 255;
    }
  } else if (channels === 2) {
    // Gray + alpha
    for (let i = 0; i < totalPixels; i++) {
      rgba[i * 4] = raw[i * 2];
      rgba[i * 4 + 1] = raw[i * 2];
      rgba[i * 4 + 2] = raw[i * 2];
      rgba[i * 4 + 3] = raw[i * 2 + 1];
    }
  }

  return { width: w, height: h, data: rgba };
}

/**
 * Resize pixel data to target dimensions using bilinear interpolation.
 */
function resizePixels(
  src: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): Uint8Array {
  const dst = new Uint8Array(dstW * dstH * 4);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const srcX = x * xRatio;
      const srcY = y * yRatio;
      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const y1 = Math.min(y0 + 1, srcH - 1);
      const xFrac = srcX - x0;
      const yFrac = srcY - y0;

      const dstIdx = (y * dstW + x) * 4;

      for (let c = 0; c < 4; c++) {
        const topLeft = src[(y0 * srcW + x0) * 4 + c];
        const topRight = src[(y0 * srcW + x1) * 4 + c];
        const bottomLeft = src[(y1 * srcW + x0) * 4 + c];
        const bottomRight = src[(y1 * srcW + x1) * 4 + c];

        const top = topLeft + (topRight - topLeft) * xFrac;
        const bottom = bottomLeft + (bottomRight - bottomLeft) * xFrac;
        dst[dstIdx + c] = Math.round(top + (bottom - top) * yFrac);
      }
    }
  }

  return dst;
}

/**
 * Compute PSNR between two RGBA pixel arrays of equal dimensions.
 */
function computePSNR(
  img1: Uint8Array,
  img2: Uint8Array,
  width: number,
  height: number
): number {
  const pixelCount = width * height;
  let mse = 0;

  for (let i = 0; i < pixelCount; i++) {
    const off = i * 4;
    for (let c = 0; c < 3; c++) {
      // RGB only, skip alpha
      const diff = img1[off + c] - img2[off + c];
      mse += diff * diff;
    }
  }

  mse /= pixelCount * 3;
  if (mse === 0) return 100; // identical

  return +(10 * Math.log10((255 * 255) / mse)).toFixed(2);
}

/**
 * Convert RGBA to grayscale luminance (ITU-R BT.601).
 */
function toGrayscale(data: Uint8Array, pixelCount: number): Float64Array {
  const gray = new Float64Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const off = i * 4;
    gray[i] = 0.299 * data[off] + 0.587 * data[off + 1] + 0.114 * data[off + 2];
  }
  return gray;
}

/**
 * Compute SSIM between two RGBA pixel arrays of equal dimensions.
 * Uses 8×8 non-overlapping windows on grayscale luminance.
 */
function computeSSIM(
  img1: Uint8Array,
  img2: Uint8Array,
  width: number,
  height: number
): number {
  const pixelCount = width * height;
  const gray1 = toGrayscale(img1, pixelCount);
  const gray2 = toGrayscale(img2, pixelCount);

  const L = 255;
  const k1 = 0.01;
  const k2 = 0.03;
  const C1 = (k1 * L) ** 2;
  const C2 = (k2 * L) ** 2;

  const windowSize = 8;
  let ssimSum = 0;
  let windowCount = 0;

  for (let y = 0; y <= height - windowSize; y += windowSize) {
    for (let x = 0; x <= width - windowSize; x += windowSize) {
      let sumX = 0,
        sumY = 0,
        sumXX = 0,
        sumYY = 0,
        sumXY = 0;
      const n = windowSize * windowSize;

      for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
          const idx = (y + wy) * width + (x + wx);
          const xVal = gray1[idx];
          const yVal = gray2[idx];
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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { enhancedImageUrl, groundTruthUrl } = await req.json();

    if (!enhancedImageUrl || !groundTruthUrl) {
      return jsonResponse(
        { error: "Both enhancedImageUrl and groundTruthUrl are required" },
        400
      );
    }

    console.log("[ground-truth-metrics] Fetching images...");
    const startTime = Date.now();

    // Fetch both images
    const [enhancedPixels, groundTruthPixels] = await Promise.all([
      fetchImagePixels(enhancedImageUrl),
      fetchImagePixels(groundTruthUrl),
    ]);

    console.log(
      `[ground-truth-metrics] Enhanced: ${enhancedPixels.width}x${enhancedPixels.height}, ` +
        `Ground Truth: ${groundTruthPixels.width}x${groundTruthPixels.height}`
    );

    // Resize enhanced image to match ground truth dimensions if different
    let enhancedData = enhancedPixels.data;
    const gtW = groundTruthPixels.width;
    const gtH = groundTruthPixels.height;

    if (enhancedPixels.width !== gtW || enhancedPixels.height !== gtH) {
      console.log(
        `[ground-truth-metrics] Resizing enhanced from ${enhancedPixels.width}x${enhancedPixels.height} to ${gtW}x${gtH}`
      );
      enhancedData = resizePixels(
        enhancedPixels.data,
        enhancedPixels.width,
        enhancedPixels.height,
        gtW,
        gtH
      );
    }

    // Compute metrics
    const psnr = computePSNR(enhancedData, groundTruthPixels.data, gtW, gtH);
    const ssim = computeSSIM(enhancedData, groundTruthPixels.data, gtW, gtH);
    const computeTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(
      `[ground-truth-metrics] PSNR=${psnr} dB, SSIM=${ssim}, computed in ${computeTime}s`
    );

    return jsonResponse({
      psnr,
      ssim,
      compute_time: +computeTime,
      comparison: {
        enhanced_dimensions: [enhancedPixels.width, enhancedPixels.height],
        ground_truth_dimensions: [gtW, gtH],
      },
    });
  } catch (error) {
    console.error("[ground-truth-metrics] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
