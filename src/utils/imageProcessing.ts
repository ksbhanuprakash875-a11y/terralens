/**
 * Client-side image post-processing utilities.
 * Provides an unsharp mask filter to enhance edge sharpness.
 */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for processing"));
    img.src = src;
  });
}

/**
 * Apply an unsharp mask to sharpen an image.
 * @param dataUrl - Source image as data URL or blob URL
 * @param strength - Sharpening strength (0 = none, 1 = strong). Default 0.5
 * @param radius - Blur radius for the mask. Default 1
 * @returns Sharpened image as a data URL (PNG)
 */
export async function sharpenImage(
  dataUrl: string,
  strength = 0.5,
  radius = 1
): Promise<string> {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  // Original canvas
  const origCanvas = document.createElement("canvas");
  origCanvas.width = w;
  origCanvas.height = h;
  const origCtx = origCanvas.getContext("2d")!;
  origCtx.drawImage(img, 0, 0);
  const origData = origCtx.getImageData(0, 0, w, h);

  // Blurred canvas (using CSS filter for Gaussian blur)
  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = w;
  blurCanvas.height = h;
  const blurCtx = blurCanvas.getContext("2d")!;
  blurCtx.filter = `blur(${radius}px)`;
  blurCtx.drawImage(img, 0, 0);
  const blurData = blurCtx.getImageData(0, 0, w, h);

  // Unsharp mask: result = original + strength * (original - blurred)
  const result = origCtx.createImageData(w, h);
  const amount = 1 + strength;

  for (let i = 0; i < origData.data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const origVal = origData.data[i + c];
      const blurVal = blurData.data[i + c];
      const sharpened = origVal * amount - blurVal * strength;
      result.data[i + c] = Math.max(0, Math.min(255, Math.round(sharpened)));
    }
    result.data[i + 3] = origData.data[i + 3]; // alpha
  }

  origCtx.putImageData(result, 0, 0);
  return origCanvas.toDataURL("image/png");
}
