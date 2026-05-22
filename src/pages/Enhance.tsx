import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudUpload,
  Loader2,
  X,
  Rocket,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import GeneratingLoader from "@/components/GeneratingLoader";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { enhanceImage, ApiError, getPendingKieTaskId } from "@/services/api";
import { useEnhance, type EnhanceResult, type MapLocation } from "@/context/EnhanceContext";
import SampleImages from "@/components/SampleImages";
import { Switch } from "@/components/ui/switch";
import { Zap, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BatchEnhance from "@/components/BatchEnhance";
import MapPicker from "@/components/MapPicker";
import { persistEnhancementImages } from "@/utils/storageUpload";

const MAX_SIZE_MB = 10;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

const Enhance = () => {
  const {
    file, preview, scaleFactor, model, qualityMode, status, error: apiError, location,
    setFile, setScaleFactor, setModel, setQualityMode, setStatus, setError, setResult, setLocation,
  } = useEnhance();

  const isFastMode = qualityMode === "fast";
  const show4xToggle = scaleFactor === "4" && model === "kie";

  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [activeBenchmark, setActiveBenchmark] = useState<{ id: string; groundTruthUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const creditCost = model.includes("gemini") ? 3 : 1;

  // Fetch credits on mount
  useEffect(() => {
    if (!user) return;
    supabase.rpc("maybe_reset_credits", { p_user_id: user.id }).then(() => {
      supabase
        .from("user_credits")
        .select("credits_remaining")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setCreditsRemaining(data.credits_remaining);
        });
    });
  }, [user]);

  const processing = status === "uploading" || status === "processing";

  const validateFile = (f: File): boolean => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast({ variant: "destructive", title: "Invalid file type", description: "Please upload a PNG or JPG image." });
      return false;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: `Maximum file size is ${MAX_SIZE_MB}MB.` });
      return false;
    }
    return true;
  };

  const handleFile = useCallback(
    (f: File, benchmarkId?: string, groundTruthUrl?: string) => {
      if (!validateFile(f)) return;
      setActiveBenchmark(
        benchmarkId && groundTruthUrl ? { id: benchmarkId, groundTruthUrl } : null
      );
      const reader = new FileReader();
      reader.onload = (e) => {
        setFile(f, e.target?.result as string);
        setStatus("idle");
        setError(null);
      };
      reader.readAsDataURL(f);
    },
    [toast, setFile, setStatus, setError]
  );

  const removeFile = () => {
    setFile(null, null);
    setStatus("idle");
    setError(null);
    setActiveBenchmark(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleEnhance = async () => {
    if (!file || !preview) return;

    setStatus("uploading");
    setError(null);

    // Credit check
    if (user && creditsRemaining !== null && creditsRemaining < creditCost) {
      toast({
        variant: "destructive",
        title: "Out of credits",
        description: `This model costs ${creditCost} credit${creditCost > 1 ? "s" : ""} but you only have ${creditsRemaining} remaining. Credits reset monthly.`,
      });
      setStatus("idle");
      return;
    }

    try {
      setStatus("processing");
      const res = await enhanceImage(file, parseInt(scaleFactor), model, isFastMode);

      const result: EnhanceResult = {
        srImageUrl: res.sr_image_url,
        originalImage: preview,
        metrics: res.metrics,
        originalDimensions: res.original_dimensions,
        enhancedDimensions: res.enhanced_dimensions,
        fileName: file.name,
        fileSize: file.size,
        model,
        scaleFactor,
        timestamp: new Date().toISOString(),
        analysis: (res as any).analysis,
        geminiFallback: !!(res as any).fallback,
        location: location || undefined,
        benchmarkImageId: activeBenchmark?.id || null,
        groundTruthUrl: activeBenchmark?.groundTruthUrl || null,
      };

      setResult(result);
      setStatus("complete");

      // Compute ground-truth metrics if this is a benchmark image
      if (activeBenchmark?.groundTruthUrl) {
        console.log("[Enhance] Computing ground-truth metrics against benchmark...");
        supabase.functions
          .invoke("compute-ground-truth-metrics", {
            body: {
              enhancedImageUrl: res.sr_image_url,
              groundTruthUrl: activeBenchmark.groundTruthUrl,
            },
          })
          .then(({ data, error: gtError }) => {
            if (gtError || data?.error) {
              console.warn("[GroundTruth] Failed:", gtError?.message || data?.error);
              return;
            }
            console.log("[GroundTruth] PSNR:", data.psnr, "SSIM:", data.ssim);
            setResult({
              ...result,
              groundTruthMetrics: {
                psnr: data.psnr,
                ssim: data.ssim,
                compute_time: data.compute_time,
              },
            });
          });
      }

      // Save to history for logged-in users with persistent storage
      if (user) {
        const historyId = crypto.randomUUID();

        // Upload images to persistent storage (fire-and-forget but update history)
        persistEnhancementImages(user.id, preview, res.sr_image_url, historyId)
          .then(({ originalUrl, enhancedUrl }) => {
            // Update the result with persistent URLs
            setResult({
              ...result,
              srImageUrl: enhancedUrl,
              originalImage: originalUrl,
            });

            return supabase.from("enhancement_history").insert({
              id: historyId,
              user_id: user.id,
              file_name: file.name,
              file_size: file.size,
              model,
              scale_factor: scaleFactor,
              original_dimensions: Array.from(res.original_dimensions),
              enhanced_dimensions: Array.from(res.enhanced_dimensions),
              psnr: res.metrics.psnr,
              ssim: res.metrics.ssim,
              processing_time: res.metrics.processing_time,
              sr_image_url: enhancedUrl,
              original_image_url: originalUrl,
              analysis: (res as any).analysis || null,
              latitude: location?.lat ?? null,
              longitude: location?.lng ?? null,
              benchmark_image_id: activeBenchmark?.id || null,
            } as any);
          })
          .then((result) => {
            if (result && 'error' in result && result.error) {
              console.warn("[History] Failed to save:", result.error.message);
            }
          });
      }

      navigate("/results");
    } catch (err: any) {
      setStatus("error");
      const message = err instanceof ApiError
        ? err.message
        : (err?.message || "An unexpected error occurred. Please try again.");
      console.error("[Enhance] Error:", err);
      setError(message);
      toast({ variant: "destructive", title: "Enhancement Failed", description: message });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-8 md:mb-10">
            <h1 className="text-3xl md:text-5xl font-extrabold mb-3">
              <span className="gradient-text">Enhance</span> Your Image{mode === "batch" ? "s" : ""}
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto text-sm md:text-base">
              Upload {mode === "batch" ? "multiple satellite images" : "a satellite image"} and let AI do the heavy lifting
            </p>

            {/* Mode toggle */}
            <div className="inline-flex mt-5 p-1 rounded-xl bg-muted/50 border border-border/50">
              <button
                onClick={() => setMode("single")}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "single"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Single
              </button>
              <button
                onClick={() => setMode("batch")}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "batch"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Batch (up to 5)
              </button>
            </div>
          </div>
          {mode === "batch" ? (
            <>
              {/* Shared settings for batch */}
              <div className="glass rounded-2xl p-5 md:p-8 mb-5 border border-border/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                  <div>
                    <Label className="text-sm font-semibold text-foreground mb-3 block">Scale Factor</Label>
                    <RadioGroup value={scaleFactor} onValueChange={setScaleFactor} className="flex gap-3" aria-label="Scale factor">
                      {["2", "4"].map((v) => (
                        <Label
                          key={v}
                          htmlFor={`batch-scale-${v}`}
                          className={`flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-xl border cursor-pointer transition-all ${
                            scaleFactor === v ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30 text-muted-foreground"
                          }`}
                        >
                          <RadioGroupItem value={v} id={`batch-scale-${v}`} />
                          <span className="font-mono font-semibold">{v}×</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-foreground mb-3 block">Model</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="rounded-xl bg-muted/50 border-border" aria-label="Select model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="real-esrgan">Real-ESRGAN</SelectItem>
                        <SelectItem value="gemini">✨ Gemini AI (Enhance + Analysis)</SelectItem>
                        <SelectItem value="kie">🚀 Kie AI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Fast/Max toggle for batch 4x Kie */}
                <AnimatePresence>
                  {show4xToggle && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-5"
                    >
                      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                        <div className="flex items-center gap-3">
                          {isFastMode ? (
                            <Zap className="w-5 h-5 text-amber-400" />
                          ) : (
                            <Sparkles className="w-5 h-5 text-primary" />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {isFastMode ? "Fast Mode" : "Max Quality"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {isFastMode ? "2K output · ~30s each" : "4K output · ~1 min each"}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={!isFastMode}
                          onCheckedChange={(checked) => setQualityMode(checked ? "max" : "fast")}
                          aria-label="Toggle quality mode"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <BatchEnhance scaleFactor={scaleFactor} model={model} isFastMode={isFastMode} creditsRemaining={creditsRemaining ?? 0} />
            </>
          ) : (
            <>
              {/* Single mode — original upload zone */}
              <motion.div
                layout
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => !preview && fileInputRef.current?.click()}
                role="button"
                aria-label={preview ? "Image uploaded" : "Upload satellite image"}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" && !preview) fileInputRef.current?.click(); }}
                className={`relative glass rounded-2xl border-2 border-dashed transition-all duration-300 ${
                  dragOver
                    ? "border-primary glow-cyan"
                    : preview
                    ? "border-border/50"
                    : "border-border hover:border-primary/50 cursor-pointer"
                } ${!preview ? "p-10 md:p-16" : "p-4 md:p-6"}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  className="hidden"
                  onChange={onFileChange}
                  aria-label="Choose image file"
                />

                <AnimatePresence mode="wait">
                  {!preview ? (
                    <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                      <motion.div
                        whileHover={{ y: -4 }}
                        transition={{ y: { repeat: Infinity, repeatType: "reverse", duration: 0.6 } }}
                        className="inline-flex"
                      >
                        <CloudUpload className="w-12 h-12 md:w-14 md:h-14 text-primary mx-auto mb-4 md:mb-5" />
                      </motion.div>
                      <p className="text-base md:text-lg font-medium text-foreground mb-1">
                        Drag & drop a satellite image here
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        or tap to browse — supports PNG, JPG, JPEG (max 10MB)
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative flex flex-col items-center">
                      <div className="relative inline-block">
                        <img src={preview} alt="Uploaded satellite image preview" className="max-h-48 md:max-h-72 rounded-xl border border-border/50" loading="lazy" />
                        {!processing && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFile(); }}
                            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 transition-colors btn-press"
                            aria-label="Remove uploaded image"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground mt-3 font-mono">
                        {file?.name}
                        <span className="ml-2 text-xs">({((file?.size ?? 0) / 1024 / 1024).toFixed(1)} MB)</span>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Benchmark Sample Images */}
              {!preview && (
                <SampleImages onSelect={handleFile} disabled={processing} />
              )}

              {/* Explore & Pick Location - always visible */}
              <div className="mt-5 md:mt-6 glass rounded-2xl p-5 md:p-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-foreground">🗺️ Explore & Pick Location</span>
                  <span className="text-[11px] text-muted-foreground">(optional)</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Browse satellite imagery, switch map layers, and click to select coordinates.
                </p>
                <MapPicker value={location} onChange={setLocation} disabled={processing} />
              </div>

              {/* Controls */}
              <AnimatePresence>
                {preview && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ delay: 0.1 }}
                    className="glass rounded-2xl p-5 md:p-8 mt-5 md:mt-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 mb-6 md:mb-8">
                      <div>
                        <Label className="text-sm font-semibold text-foreground mb-3 block">Scale Factor</Label>
                        <RadioGroup value={scaleFactor} onValueChange={setScaleFactor} disabled={processing} className="flex gap-3" aria-label="Scale factor">
                          {["2", "4"].map((v) => (
                            <Label
                              key={v}
                              htmlFor={`scale-${v}`}
                              className={`flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-xl border cursor-pointer transition-all ${
                                scaleFactor === v ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30 text-muted-foreground"
                              } ${processing ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              <RadioGroupItem value={v} id={`scale-${v}`} />
                              <span className="font-mono font-semibold">{v}×</span>
                            </Label>
                          ))}
                        </RadioGroup>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-foreground mb-3 block">Model</Label>
                        <Select value={model} onValueChange={setModel} disabled={processing}>
                          <SelectTrigger className="rounded-xl bg-muted/50 border-border" aria-label="Select model">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="real-esrgan">Real-ESRGAN</SelectItem>
                            <SelectItem value="gemini">✨ Gemini AI (Enhance + Analysis)</SelectItem>
                            <SelectItem value="kie">🚀 Kie AI</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          {model === "real-esrgan" && "Best for real-world degraded images · 1 credit"}
                          {model === "gemini" && "AI-powered enhancement + scene analysis · 3 credits"}
                          {model === "kie" && "Kie AI Nano Banana 2 — fast 4K enhancement · 1 credit"}
                        </p>
                        {user && creditsRemaining !== null && (
                          <p className={`text-[11px] mt-1 font-medium ${creditsRemaining < creditCost ? "text-destructive" : "text-primary"}`}>
                            {creditsRemaining} credit{creditsRemaining !== 1 ? "s" : ""} remaining
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Fast / Max Quality toggle for 4x Kie */}
                    <AnimatePresence>
                      {show4xToggle && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-6 md:mb-8"
                        >
                          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                            <div className="flex items-center gap-3">
                              {isFastMode ? (
                                <Zap className="w-5 h-5 text-amber-400" />
                              ) : (
                                <Sparkles className="w-5 h-5 text-primary" />
                              )}
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {isFastMode ? "Fast Mode" : "Max Quality"}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {isFastMode
                                    ? "2K output · ~30s · auto-fallback if slow"
                                    : "4K output · ~1 min · highest detail"}
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={!isFastMode}
                              onCheckedChange={(checked) => setQualityMode(checked ? "max" : "fast")}
                              disabled={processing}
                              aria-label="Toggle quality mode"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <AnimatePresence>
                      {status === "error" && apiError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-4 rounded-xl bg-destructive/10 border border-destructive/30 overflow-hidden"
                        >
                          <div className="p-4 text-sm text-destructive flex items-center justify-between gap-3">
                            <span>{apiError}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleEnhance}
                              className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 btn-press"
                              aria-label="Retry enhancement"
                            >
                              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
                            </Button>
                          </div>
                          {getPendingKieTaskId() && model === "kie" && (
                            <div className="px-4 pb-3 flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                              <RefreshCw className="w-3 h-3 text-primary" />
                              <span>Task <span className="text-primary">{getPendingKieTaskId()?.slice(0, 8)}…</span> saved — retry will resume without extra charges</span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button
                      onClick={handleEnhance}
                      disabled={processing}
                      size="lg"
                      aria-label={processing ? "Processing image" : "Enhance image"}
                      className={`w-full rounded-xl text-base font-bold py-5 md:py-6 transition-all btn-press ${
                        processing ? "bg-muted text-muted-foreground" : "btn-gradient text-primary-foreground shimmer glow-cyan"
                      }`}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          {status === "uploading" ? "Uploading..." : "Processing..."}
                        </>
                      ) : (
                        <>
                          Enhance Image <Rocket className="w-5 h-5 ml-2" />
                          <span className="ml-2 text-xs opacity-70">({creditCost} credit{creditCost > 1 ? "s" : ""})</span>
                        </>
                      )}
                    </Button>

                    <AnimatePresence>
                      {processing && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-6 md:mt-8 flex flex-col items-center">
                          <GeneratingLoader />
                          <div className="w-full mt-5">
                            <div className="h-2 md:h-2.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-label="Processing progress">
                              <motion.div
                                className="h-full rounded-full btn-gradient"
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 25, ease: "linear" }}
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">This may take up to 30 seconds depending on image size</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Enhance;
