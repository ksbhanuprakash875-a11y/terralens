import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageBase64, scaleFactor } = await req.json();
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize to data URL
    let dataUrl = imageBase64;
    if (!dataUrl.startsWith("data:")) {
      dataUrl = `data:image/jpeg;base64,${dataUrl}`;
    }

    const scale = scaleFactor || 4;
    const startTime = Date.now();


    // ── Step 1: Scene analysis using text model ──
    const analysisResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this satellite image for super-resolution enhancement at ${scale}x scale. Provide:
1. Scene type (urban/rural/terrain/water/mixed)
2. Key features detected (buildings, roads, vegetation, water bodies)
3. Current quality assessment (noise, blur, artifacts)
4. Expected improvement areas from ${scale}x enhancement
Keep response under 150 words, use bullet points.`,
                },
                {
                  type: "image_url",
                  image_url: { url: dataUrl },
                },
              ],
            },
          ],
        }),
      }
    );

    let analysisText = "Analysis unavailable.";
    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json();
      analysisText =
        analysisData.choices?.[0]?.message?.content || "Analysis unavailable.";
    } else {
      console.warn("Analysis step failed:", analysisResponse.status);
    }

    // ── Step 2: AI image enhancement using image generation model ──
    const enhanceResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Enhance this satellite image for super-resolution. Increase sharpness, reduce noise and blur, enhance fine details like buildings, roads, vegetation edges, and terrain textures. Make it look like a higher resolution version of the same image. Preserve the original colors, contrast, and geographic content accurately. Do not add any text, watermarks, labels, or annotations to the image.`,
                },
                {
                  type: "image_url",
                  image_url: { url: dataUrl },
                },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      }
    );

    const processingTime = (Date.now() - startTime) / 1000;

    if (!enhanceResponse.ok) {
      const errText = await enhanceResponse.text();
      console.error("Image generation error:", enhanceResponse.status, errText);

      if (enhanceResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in 30 seconds." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (enhanceResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fallback: return original image with analysis only
      return new Response(
        JSON.stringify({
          sr_image_url: imageBase64,
          metrics: { psnr: 0, ssim: 0, processing_time: +processingTime.toFixed(1) },
          original_dimensions: [0, 0],
          enhanced_dimensions: [0, 0],
          analysis: analysisText,
          fallback: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const enhanceData = await enhanceResponse.json();
    const enhancedImageUrl =
      enhanceData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!enhancedImageUrl) {
      console.warn("No image returned from generation model, falling back to original");
      return new Response(
        JSON.stringify({
          sr_image_url: imageBase64,
          metrics: { psnr: 0, ssim: 0, processing_time: +processingTime.toFixed(1) },
          original_dimensions: [0, 0],
          enhanced_dimensions: [0, 0],
          analysis: analysisText,
          fallback: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        sr_image_url: enhancedImageUrl,
        metrics: {
          psnr: 0,
          ssim: 0,
          processing_time: +processingTime.toFixed(1),
        },
        original_dimensions: [0, 0],
        enhanced_dimensions: [0, 0],
        analysis: analysisText,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("gemini-enhance error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
