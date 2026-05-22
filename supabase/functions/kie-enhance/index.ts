import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KIE_API_BASE = "https://api.kie.ai";
const KIE_FILE_BASE = "https://kieai.redpandaai.co";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  return { mimeType, ext };
}

function isSuccessState(state: string) {
  return ["success", "succeeded", "complete", "completed", "done", "finish", "finished"].includes(state);
}

function isFailureState(state: string) {
  return ["fail", "failed", "error", "cancel", "cancelled", "canceled"].includes(state);
}

async function handleStart(
  KIE_API_KEY: string,
  imageBase64: string,
  scaleFactor: number,
  fastMode = false,
) {
  const parsed = parseDataUrl(imageBase64);
  if (!parsed) return jsonResponse({ error: "Invalid image format. Expected base64 data URL." }, 400);

  const scale = scaleFactor || 4;
  const resolution = fastMode ? "2K" : scale >= 4 ? "4K" : "2K";

  const uploadRes = await fetch(`${KIE_FILE_BASE}/api/file-base64-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      base64Data: imageBase64,
      uploadPath: "satellite-enhance",
      fileName: `upload-${Date.now()}.${parsed.ext}`,
    }),
  });

  const uploadText = await uploadRes.text();
  let uploadJson: any = null;
  try {
    uploadJson = JSON.parse(uploadText);
  } catch {
    /* ignore */
  }

  if (!uploadRes.ok || !uploadJson || uploadJson.code !== 200) {
    console.error("[kie-enhance] Upload failed:", uploadRes.status, uploadText);
    return jsonResponse({ error: uploadJson?.msg || `Upload failed (${uploadRes.status})` }, 500);
  }

  const uploadedUrl = uploadJson?.data?.fileUrl || uploadJson?.data?.downloadUrl;
  if (!uploadedUrl) {
    return jsonResponse({ error: "Upload succeeded but returned no file URL" }, 500);
  }

  const taskRes = await fetch(`${KIE_API_BASE}/api/v1/jobs/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nano-banana-2",
      input: {
        prompt: `Enhance and upscale this satellite image to ${scale}x resolution. Improve clarity, sharpness, and detail while preserving original colors and features.`,
        image_input: [uploadedUrl],
        aspect_ratio: "auto",
        resolution,
        output_format: "png",
      },
    }),
  });

  const taskText = await taskRes.text();
  let taskJson: any = null;
  try {
    taskJson = JSON.parse(taskText);
  } catch {
    /* ignore */
  }

  if (!taskRes.ok || !taskJson || taskJson.code !== 200) {
    console.error("[kie-enhance] Task creation failed:", taskText);
    return jsonResponse({ error: taskJson?.msg || "Task creation failed" }, 500);
  }

  const taskId = taskJson?.data?.taskId;
  if (!taskId) {
    return jsonResponse({ error: "Task created but no taskId returned" }, 500);
  }

  return jsonResponse({ taskId, startTime: Date.now() });
}

async function handlePoll(KIE_API_KEY: string, taskId: string, startTime: number) {
  const statusRes = await fetch(`${KIE_API_BASE}/api/v1/jobs/recordInfo?taskId=${taskId}`, {
    headers: { Authorization: `Bearer ${KIE_API_KEY}` },
  });

  const statusText = await statusRes.text();
  console.log("[kie-enhance] Poll response:", statusRes.status, statusText);

  let statusJson: any = null;
  try {
    statusJson = JSON.parse(statusText);
  } catch {
    /* ignore */
  }

  if (!statusRes.ok || !statusJson || statusJson.code !== 200) {
    console.error("[kie-enhance] Poll failed:", statusRes.status, statusText);
    return jsonResponse({ status: "polling", message: "Poll request failed, retry" });
  }

  const state = String(statusJson?.data?.state || "unknown").toLowerCase();
  console.log("[kie-enhance] Task state:", state);

  if (isSuccessState(state)) {
    const rawResult = statusJson?.data?.resultJson;
    let parsedResult: any = {};

    if (typeof rawResult === "string") {
      try {
        parsedResult = JSON.parse(rawResult);
      } catch {
        /* ignore */
      }
    } else if (rawResult && typeof rawResult === "object") {
      parsedResult = rawResult;
    }

    const urls = parsedResult?.resultUrls;
    const resultUrl = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;

    if (!resultUrl) {
      return jsonResponse({ error: "Task succeeded but no result URL found" }, 500);
    }

    const processingTime = (Date.now() - (startTime || Date.now())) / 1000;

    return jsonResponse({
      status: "complete",
      taskState: state,
      sr_image_url: resultUrl,
      metrics: {
        psnr: 0,
        ssim: 0,
        processing_time: +processingTime.toFixed(1),
      },
      original_dimensions: [0, 0],
      enhanced_dimensions: [0, 0],
    });
  }

  if (isFailureState(state)) {
    const failCode = statusJson?.data?.failCode;
    const failMsg = statusJson?.data?.failMsg || "Enhancement failed";

    // Return HTTP 200 so the client can read structured failure payload
    // and decide whether to retry, fallback, or show a precise error.
    return jsonResponse({
      status: "failed",
      taskState: state,
      failCode,
      error: failMsg,
    });
  }

  return jsonResponse({ status: "polling", taskState: state });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
    if (!KIE_API_KEY) throw new Error("KIE_API_KEY is not configured");

    const body = await req.json();
    const { mode } = body;

    if (mode === "poll") {
      const { taskId, startTime } = body;
      if (!taskId) return jsonResponse({ error: "taskId is required for polling" }, 400);
      return handlePoll(KIE_API_KEY, taskId, startTime);
    }

    const { imageBase64, scaleFactor, fastMode } = body;
    if (!imageBase64) return jsonResponse({ error: "imageBase64 is required" }, 400);
    return handleStart(KIE_API_KEY, imageBase64, scaleFactor, Boolean(fastMode));
  } catch (error) {
    console.error("[kie-enhance] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
