import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REPLICATE_API = "https://api.replicate.com/v1/predictions";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_TIME_MS = 120_000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
    if (!REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN is not configured");

    const { imageBase64, scaleFactor } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return jsonResponse({ error: "imageBase64 is required" }, 400);
    }

    const startTime = Date.now();
    const scale = Math.min(scaleFactor || 4, 10);

    // Replicate accepts data URIs directly as image input
    const inputImage = imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`;

    // 1) Create prediction using nightmareai/real-esrgan
    const createRes = await fetch(REPLICATE_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        "Prefer": "wait",
      },
      body: JSON.stringify({
        version: "f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
        input: {
          image: inputImage,
          scale: scale > 10 ? 10 : scale,
          face_enhance: false,
        },
      }),
    });

    const createJson = await createRes.json();

    if (!createRes.ok) {
      console.error("[realesrgan] Create prediction failed:", createRes.status, JSON.stringify(createJson));
      return jsonResponse({
        error: createJson?.detail || createJson?.title || `Replicate API error (${createRes.status})`,
      }, 500);
    }

    // If the "Prefer: wait" header worked, we may already have the result
    if (createJson.status === "succeeded" && createJson.output) {
      const processingTime = (Date.now() - startTime) / 1000;
      return jsonResponse({
        sr_image_url: createJson.output,
        metrics: {
          psnr: 0,
          ssim: 0,
          processing_time: +processingTime.toFixed(1),
        },
        original_dimensions: [0, 0],
        enhanced_dimensions: [0, 0],
      });
    }

    const predictionId = createJson.id;
    const pollUrl = createJson.urls?.get || `${REPLICATE_API}/${predictionId}`;

    // 2) Poll for result
    let resultUrl: string | null = null;
    const pollStart = Date.now();

    while (Date.now() - pollStart < MAX_POLL_TIME_MS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const statusRes = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
      });
      const statusJson = await statusRes.json();

      if (statusJson.status === "succeeded") {
        resultUrl = statusJson.output;
        break;
      }

      if (statusJson.status === "failed" || statusJson.status === "canceled") {
        const errMsg = statusJson.error || "Real-ESRGAN processing failed";
        console.error("[realesrgan] Failed:", errMsg);
        return jsonResponse({ error: errMsg }, 500);
      }
    }

    if (!resultUrl) {
      return jsonResponse({ error: "Enhancement timed out" }, 500);
    }

    const processingTime = (Date.now() - startTime) / 1000;

    return jsonResponse({
      sr_image_url: resultUrl,
      metrics: {
        psnr: 0,
        ssim: 0,
        processing_time: +processingTime.toFixed(1),
      },
      original_dimensions: [0, 0],
      enhanced_dimensions: [0, 0],
    });
  } catch (error) {
    console.error("[realesrgan] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
