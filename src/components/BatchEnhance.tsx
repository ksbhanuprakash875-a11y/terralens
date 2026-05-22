import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudUpload, X, Loader2, CheckCircle2, AlertCircle,
  Rocket, ImageIcon, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { enhanceImage, ApiError } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const MAX_SIZE_MB = 10;
const MAX_FILES = 5;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

type ItemStatus = "queued" | "processing" | "complete" | "error";

interface BatchItem {
  id: string;
  file: File;
  preview: string;
  status: ItemStatus;
  error?: string;
  progress: number;
}

interface Props {
  scaleFactor: string;
  model: string;
  isFastMode: boolean;
  creditsRemaining: number;
}

const BatchEnhance = ({ scaleFactor, model, isFastMode, creditsRemaining }: Props) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [running, setRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const updateItem = (id: string, patch: Partial<BatchItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const validateFile = (f: File): boolean => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast({ variant: "destructive", title: "Invalid type", description: `${f.name} — only PNG/JPG allowed.` });
      return false;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      toast({ variant: "destructive", title: "Too large", description: `${f.name} exceeds ${MAX_SIZE_MB}MB.` });
      return false;
    }
    return true;
  };

  const addFiles = useCallback(
    (fileList: FileList) => {
      const remaining = MAX_FILES - items.length;
      if (remaining <= 0) {
        toast({ variant: "destructive", title: "Queue full", description: `Maximum ${MAX_FILES} images allowed.` });
        return;
      }

      const newItems: BatchItem[] = [];
      const toProcess = Array.from(fileList).slice(0, remaining);

      let loaded = 0;
      toProcess.forEach((f) => {
        if (!validateFile(f)) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          newItems.push({
            id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
            file: f,
            preview: e.target?.result as string,
            status: "queued",
            progress: 0,
          });
          loaded++;
          if (loaded === toProcess.length) {
            setItems((prev) => [...prev, ...newItems]);
          }
        };
        reader.readAsDataURL(f);
      });
    },
    [items.length, toast]
  );

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const clearAll = () => {
    if (running) return;
    setItems([]);
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (running) return;
      addFiles(e.dataTransfer.files);
    },
    [addFiles, running]
  );

  const costPerImage = model.toLowerCase().includes("gemini") ? 3 : 1;
  const queuedItems = items.filter((it) => it.status === "queued" || it.status === "error");
  const totalCost = costPerImage * queuedItems.length;
  const insufficientCredits = totalCost > creditsRemaining;

  const processQueue = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Sign in required", description: "Please sign in to use batch mode." });
      return;
    }

    if (insufficientCredits) {
      toast({ variant: "destructive", title: "Insufficient credits", description: `You need ${totalCost} credits but only have ${creditsRemaining}.` });
      return;
    }

    const queued = queuedItems;
    if (queued.length === 0) return;

    setRunning(true);
    abortRef.current = false;

    // Reset errored items to queued
    queued.forEach((it) => updateItem(it.id, { status: "queued", error: undefined, progress: 0 }));

    for (const item of queued) {
      if (abortRef.current) break;

      updateItem(item.id, { status: "processing", progress: 10 });

      try {
        // Simulate progress ticks
        const progressInterval = setInterval(() => {
          setItems((prev) => {
            const current = prev.find((it) => it.id === item.id);
            if (current && current.status === "processing" && current.progress < 85) {
              return prev.map((it) =>
                it.id === item.id ? { ...it, progress: Math.min(it.progress + 5, 85) } : it
              );
            }
            return prev;
          });
        }, 2000);

        const res = await enhanceImage(item.file, parseInt(scaleFactor), model, isFastMode);

        clearInterval(progressInterval);
        updateItem(item.id, { status: "complete", progress: 100 });

        // Save to history
        supabase.from("enhancement_history").insert({
          user_id: user.id,
          file_name: item.file.name,
          file_size: item.file.size,
          model,
          scale_factor: scaleFactor,
          original_dimensions: Array.from(res.original_dimensions),
          enhanced_dimensions: Array.from(res.enhanced_dimensions),
          psnr: res.metrics.psnr,
          ssim: res.metrics.ssim,
          processing_time: res.metrics.processing_time,
          sr_image_url: res.sr_image_url,
          analysis: (res as any).analysis || null,
        }).then(({ error: histErr }) => {
          if (histErr) console.warn("[Batch] History save failed:", histErr.message);
        });
      } catch (err: any) {
        const message = err instanceof ApiError ? err.message : (err?.message || "Enhancement failed");
        updateItem(item.id, { status: "error", error: message, progress: 0 });
      }
    }

    setRunning(false);

    const results = items.filter((it) => it.status !== "queued");
    const completed = results.filter((it) => it.status === "complete").length;
    const failed = results.filter((it) => it.status === "error").length;

    if (completed > 0) {
      toast({ title: "Batch complete", description: `${completed} enhanced${failed > 0 ? `, ${failed} failed` : ""}` });
    }
  };

  const stopQueue = () => {
    abortRef.current = true;
  };

  const hasQueued = items.some((it) => it.status === "queued" || it.status === "error");
  const completedCount = items.filter((it) => it.status === "complete").length;
  const totalCount = items.length;

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <motion.div
        layout
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !running && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" && !running) fileInputRef.current?.click(); }}
        className={`relative glass rounded-2xl border-2 border-dashed transition-all duration-300 p-8 md:p-12 text-center ${
          dragOver
            ? "border-primary glow-cyan"
            : "border-border hover:border-primary/50 cursor-pointer"
        } ${running ? "opacity-60 pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <CloudUpload className="w-10 h-10 text-primary mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">
          Drop up to {MAX_FILES} images here
        </p>
        <p className="text-xs text-muted-foreground">
          PNG, JPG (max {MAX_SIZE_MB}MB each) · {items.length}/{MAX_FILES} in queue
        </p>
      </motion.div>

      {/* Queue */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="glass rounded-2xl p-5 border border-border/50"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Queue ({completedCount}/{totalCount})
                </span>
                {queuedItems.length > 0 && (
                  <Badge variant={insufficientCredits ? "destructive" : "secondary"} className="text-[10px] px-2 py-0">
                    {totalCost} credit{totalCost !== 1 ? "s" : ""} · {creditsRemaining} left
                  </Badge>
                )}
              </div>
              {!running && items.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30"
                >
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className="w-12 h-12 rounded-lg object-cover border border-border/50 shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.status === "queued" && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          Queued
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                            {costPerImage} cr
                          </Badge>
                        </span>
                      )}
                      {item.status === "processing" && (
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className="h-full rounded-full btn-gradient"
                              initial={{ width: "0%" }}
                              animate={{ width: `${item.progress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <span className="text-[11px] text-primary font-mono">{item.progress}%</span>
                        </div>
                      )}
                      {item.status === "complete" && (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Done
                        </span>
                      )}
                      {item.status === "error" && (
                        <span className="text-[11px] text-destructive flex items-center gap-1 truncate">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {item.error || "Failed"}
                        </span>
                      )}
                    </div>
                  </div>

                  {!running && item.status !== "processing" && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      aria-label={`Remove ${item.file.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {item.status === "processing" && (
                    <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                  )}
                </motion.div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-3">
              {running ? (
                <Button
                  onClick={stopQueue}
                  variant="outline"
                  className="flex-1 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <X className="w-4 h-4 mr-1.5" /> Stop
                </Button>
              ) : (
                <>
                  {hasQueued && (
                    <Button
                      onClick={processQueue}
                      disabled={insufficientCredits}
                      className="flex-1 rounded-xl btn-gradient text-primary-foreground font-bold py-5 shimmer glow-cyan disabled:opacity-50"
                    >
                      <Rocket className="w-5 h-5 mr-2" />
                      Enhance {queuedItems.length} Image{queuedItems.length > 1 ? "s" : ""} · {totalCost} credit{totalCost !== 1 ? "s" : ""}
                    </Button>
                  )}
                  {insufficientCredits && hasQueued && (
                    <p className="text-[11px] text-destructive text-center w-full">
                      Not enough credits. You need {totalCost} but have {creditsRemaining}.
                    </p>
                  )}
                  {items.some((it) => it.status === "error") && (
                    <Button
                      onClick={processQueue}
                      variant="outline"
                      className="rounded-xl border-primary/30"
                    >
                      <RefreshCw className="w-4 h-4 mr-1.5" /> Retry Failed
                    </Button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth gate */}
      {!user && items.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-center text-amber-400"
        >
          ⚠️ Sign in required to use batch mode. Your results will be saved to your dashboard.
        </motion.p>
      )}
    </div>
  );
};

export default BatchEnhance;
