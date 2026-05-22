import { supabase } from "@/integrations/supabase/client";

const BUCKET = "enhanced-images";

/**
 * Upload an image (data URL or external URL) to Supabase Storage.
 * Returns the public URL of the stored file.
 */
export async function uploadImageToStorage(
  userId: string,
  imageSource: string,
  fileName: string
): Promise<string | null> {
  try {
    let blob: Blob;

    if (imageSource.startsWith("data:")) {
      // Convert data URL to blob
      const res = await fetch(imageSource);
      blob = await res.blob();
    } else if (imageSource.startsWith("http://") || imageSource.startsWith("https://")) {
      // Fetch external URL and convert to blob
      const res = await fetch(imageSource);
      if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
      blob = await res.blob();
    } else {
      console.warn("[storageUpload] Unsupported image source format");
      return null;
    }

    const ext = blob.type.includes("png") ? "png" : "jpg";
    const storagePath = `${userId}/${fileName}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, blob, {
        contentType: blob.type || "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.warn("[storageUpload] Upload failed:", error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch (e: any) {
    console.warn("[storageUpload] Error:", e?.message);
    return null;
  }
}

/**
 * Upload both original and enhanced images to persistent storage.
 * Returns the storage URLs (falls back to originals if upload fails).
 */
export async function persistEnhancementImages(
  userId: string,
  originalImage: string,
  enhancedImage: string,
  enhancementId: string
): Promise<{ originalUrl: string; enhancedUrl: string }> {
  const [storedOriginal, storedEnhanced] = await Promise.all([
    uploadImageToStorage(userId, originalImage, `${enhancementId}-original`),
    uploadImageToStorage(userId, enhancedImage, `${enhancementId}-enhanced`),
  ]);

  return {
    originalUrl: storedOriginal || originalImage,
    enhancedUrl: storedEnhanced || enhancedImage,
  };
}
