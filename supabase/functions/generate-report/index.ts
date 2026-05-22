import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

    const { metrics, originalDimensions, enhancedDimensions, model, scaleFactor, fileName, analysis } = await req.json();

    const prompt = `You are a satellite imagery analysis expert. Generate a structured enhancement report based on the following data.

Image: ${fileName}
Model: ${model}, Scale: ${scaleFactor}×
Original: ${originalDimensions?.[0]}×${originalDimensions?.[1]}px → Enhanced: ${enhancedDimensions?.[0]}×${enhancedDimensions?.[1]}px
PSNR: ${metrics?.psnr?.toFixed(2) ?? "N/A"} dB, SSIM: ${metrics?.ssim?.toFixed(4) ?? "N/A"}
Processing Time: ${metrics?.processing_time?.toFixed(1) ?? "N/A"}s

${analysis ? `Existing AI Analysis:\n${analysis}` : "No prior analysis available."}

Produce a report with these sections (use plain text, no markdown):
1. SCENE OVERVIEW - Brief description of what the satellite image likely contains
2. DETECTED FEATURES - List key geographic/urban/natural features detected
3. QUALITY ASSESSMENT - Interpret the PSNR and SSIM scores
4. ENHANCEMENT IMPACT - How the super-resolution improved the image
5. RECOMMENDATIONS - Suggestions for optimal use of the enhanced image

Keep it concise but professional. Each section should be 2-3 sentences.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 1024,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error:", groqRes.status, errText);
      return new Response(JSON.stringify({ error: "AI report generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqData = await groqRes.json();
    const reportText = groqData.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ report: reportText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
