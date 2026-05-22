import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Download,
  ArrowLeft,
  BarChart3,
  Columns2,
  SlidersHorizontal,
  Clock,
  Maximize,
  Search,
  ImageIcon,
  Activity,
  Gauge,
  FileText,
  Loader2,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import ImageLightbox from "@/components/ImageLightbox";
import ResultsSlider from "@/components/ResultsSlider";
import RadialMetric from "@/components/RadialMetric";
import AiAnalysis from "@/components/AiAnalysis";
import AnimatedDownloadButton from "@/components/AnimatedDownloadButton";
import MapOverlay from "@/components/MapOverlay";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useEnhance } from "@/context/EnhanceContext";
import { generateEnhancementReport } from "@/utils/generateReport";
import { sharpenImage } from "@/utils/imageProcessing";
import { toast } from "sonner";

const Results = () => {
  const { result } = useEnhance();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<"side" | "slider">("side");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showBicubic, setShowBicubic] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [sharpening, setSharpening] = useState(false);
  const [sharpenedUrl, setSharpenedUrl] = useState<string | null>(null);

  const handleDownloadReport = useCallback(async () => {
    if (!result) return;
    setGeneratingReport(true);
    try {
      const blob = await generateEnhancementReport(result);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${result.fileName.replace(/\.[^.]+$/, "")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded!");
    } catch (err) {
      console.error("Report generation failed:", err);
      toast.error("Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  }, [result]);

  const handleSharpen = useCallback(async () => {
    if (!result) return;
    if (sharpenedUrl) {
      setSharpenedUrl(null);
      return;
    }
    setSharpening(true);
    try {
      const sharpened = await sharpenImage(result.srImageUrl, 0.5);
      setSharpenedUrl(sharpened);
      toast.success("Sharpening applied!");
    } catch (err) {
      console.error("Sharpening failed:", err);
      toast.error("Failed to apply sharpening");
    } finally {
      setSharpening(false);
    }
  }, [result, sharpenedUrl]);

  // Toast feedback for Gemini enhancement outcome
  useEffect(() => {
    if (!result || result.model !== "gemini") return;
    if (result.geminiFallback) {
      toast.warning("Gemini fell back to analysis-only mode — no image enhancement was applied.", {
        duration: 6000,
      });
    } else {
      toast.success("Gemini enhancement completed successfully!", {
        duration: 4000,
      });
    }
  }, [result]);

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-28 pb-20">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full glass flex items-center justify-center mx-auto mb-6" aria-hidden="true">
              <ImageIcon className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold mb-3 text-foreground">No image to display</h1>
            <p className="text-sm md:text-base text-muted-foreground mb-8">
              Upload and enhance a satellite image first to see your results here.
            </p>
            <Button asChild size="lg" className="btn-gradient text-primary-foreground glow-cyan rounded-xl px-8 btn-press">
              <Link to="/enhance">Go to Enhance Page</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const {
    srImageUrl,
    originalImage,
    metrics,
    originalDimensions,
    enhancedDimensions,
    fileName,
    fileSize,
    model,
    scaleFactor,
    timestamp,
    analysis,
    geminiFallback,
  } = result;

  const scale = parseInt(scaleFactor);
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(1);
  const enhancedSizeMB = ((fileSize * 1.8) / 1024 / 1024).toFixed(1);
  const formattedTime = timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString();
  const displayEnhancedUrl = sharpenedUrl || srImageUrl;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = displayEnhancedUrl;
    link.download = `enhanced_${fileName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ImageLightbox src={lightboxSrc || ""} alt="Zoomed image" open={!!lightboxSrc} onClose={() => setLightboxSrc(null)} />

      <div className="container mx-auto px-4 pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="max-w-[960px] mx-auto">
          <div className="text-center mb-8 md:mb-10">
            <h1 className="text-3xl md:text-5xl font-extrabold mb-3">
              <span className="gradient-text">Enhancement</span> Results
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Your image has been upscaled {scaleFactor}× using {model.toUpperCase()}
            </p>
          </div>

          {/* Gemini Fallback Banner */}
          {geminiFallback && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 md:mb-6 glass rounded-2xl border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3"
            >
              <div className="mt-0.5 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-300">Analysis-Only Mode</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gemini's image generation was unavailable, so the original image is shown alongside a detailed AI scene analysis. No visual enhancement was applied.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 rounded-xl border-amber-500/30 text-amber-300 hover:bg-amber-500/20 btn-press"
                onClick={() => navigate("/enhance")}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Retry
              </Button>
            </motion.div>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center justify-center gap-2 mb-5 md:mb-6" role="tablist" aria-label="Comparison view mode">
            <button
              role="tab"
              aria-selected={viewMode === "side"}
              onClick={() => setViewMode("side")}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all btn-press ${
                viewMode === "side" ? "glass border-primary/40 text-primary glow-cyan-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Columns2 className="w-4 h-4" /> Side-by-Side
            </button>
            <button
              role="tab"
              aria-selected={viewMode === "slider"}
              onClick={() => setViewMode("slider")}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all btn-press ${
                viewMode === "slider" ? "glass border-primary/40 text-primary glow-cyan-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" /> Slider
            </button>
          </div>

          {/* Comparison Section */}
          <motion.div key={viewMode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} role="tabpanel">
            {viewMode === "side" ? (
              <div className={`grid gap-3 md:gap-4 ${showBicubic ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
                <div className="glass rounded-2xl p-2 md:p-3 group cursor-zoom-in" onClick={() => setLightboxSrc(originalImage)} role="button" aria-label="View original image in lightbox">
                  <div className="relative overflow-hidden rounded-xl">
                    <img src={originalImage} alt="Original satellite image" className="w-full aspect-square object-contain bg-muted/40 rounded-xl transition-transform group-hover:scale-[1.02]" loading="lazy" />
                    <div className="absolute top-2 left-2 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full bg-destructive/20 border border-destructive/30 text-[10px] md:text-xs font-mono text-destructive-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive" aria-hidden="true" />
                      Original (Low-Res)
                    </div>
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-center justify-center">
                      <Search className="w-6 h-6 md:w-8 md:h-8 text-foreground/0 group-hover:text-foreground/60 transition-colors" />
                    </div>
                  </div>
                </div>

                <div className="glass rounded-2xl p-2 md:p-3 group cursor-zoom-in" onClick={() => setLightboxSrc(displayEnhancedUrl)} role="button" aria-label="View enhanced image in lightbox">
                  <div className="relative overflow-hidden rounded-xl">
                    <img src={displayEnhancedUrl} alt="Enhanced satellite image" className="w-full aspect-square object-contain bg-muted/20 rounded-xl transition-transform group-hover:scale-[1.02]" loading="lazy" />
                    <div className="absolute top-2 left-2 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] md:text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                      Enhanced (Super-Res)
                    </div>
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-center justify-center">
                      <Search className="w-6 h-6 md:w-8 md:h-8 text-foreground/0 group-hover:text-foreground/60 transition-colors" />
                    </div>
                  </div>
                </div>

                {showBicubic && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-2 md:p-3 group cursor-zoom-in" onClick={() => setLightboxSrc(originalImage)} role="button" aria-label="View bicubic interpolation in lightbox">
                    <div className="relative overflow-hidden rounded-xl">
                      <img src={originalImage} alt="Bicubic interpolation result" className="w-full aspect-square object-contain bg-muted/30 rounded-xl transition-transform group-hover:scale-[1.02]" style={{ filter: "blur(0.5px)" }} loading="lazy" />
                      <div className="absolute top-2 left-2 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-[10px] md:text-xs font-mono text-amber-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                        Bicubic
                      </div>
                      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-center justify-center">
                        <Search className="w-6 h-6 md:w-8 md:h-8 text-foreground/0 group-hover:text-foreground/60 transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <ResultsSlider originalSrc={originalImage} enhancedSrc={displayEnhancedUrl} />
            )}
          </motion.div>

          {/* Metrics */}
          {result.groundTruthMetrics && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3 justify-center">
                <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  ✓ Ground-Truth Metrics (vs High-Res Original)
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <RadialMetric value={result.groundTruthMetrics.psnr} max={40} label="GT PSNR" displayValue={`${result.groundTruthMetrics.psnr.toFixed(1)} dB`} color="cyan" icon={<Activity className="w-4 h-4 md:w-5 md:h-5" />} delay={0.1} />
                <RadialMetric value={result.groundTruthMetrics.ssim} max={1} label="GT SSIM" displayValue={result.groundTruthMetrics.ssim.toFixed(4)} color="violet" icon={<Gauge className="w-4 h-4 md:w-5 md:h-5" />} delay={0.2} />
                <RadialMetric value={result.groundTruthMetrics.compute_time} max={10} label="Compute Time" displayValue={`${result.groundTruthMetrics.compute_time.toFixed(1)}s`} color="cyan" icon={<Clock className="w-4 h-4 md:w-5 md:h-5" />} delay={0.3} />
                <RadialMetric value={scale} max={8} label="Scale Factor" displayValue={`${scaleFactor}×`} color="violet" icon={<Maximize className="w-4 h-4 md:w-5 md:h-5" />} delay={0.4} />
              </div>
            </div>
          )}

          <div className="mb-2">
            {result.groundTruthMetrics && (
              <p className="text-center text-[10px] text-muted-foreground mb-2">Self-referential metrics (original vs enhanced)</p>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <RadialMetric value={metrics.psnr} max={40} label="PSNR" displayValue={`${metrics.psnr.toFixed(1)} dB`} color="cyan" icon={<Activity className="w-4 h-4 md:w-5 md:h-5" />} delay={0.1} />
            <RadialMetric value={metrics.ssim} max={1} label="SSIM" displayValue={metrics.ssim.toFixed(2)} color="violet" icon={<Gauge className="w-4 h-4 md:w-5 md:h-5" />} delay={0.2} />
            <RadialMetric value={metrics.processing_time} max={10} label="Processing Time" displayValue={`${metrics.processing_time.toFixed(1)}s`} color="cyan" icon={<Clock className="w-4 h-4 md:w-5 md:h-5" />} delay={0.3} />
            <RadialMetric value={scale} max={8} label="Scale Factor" displayValue={`${scaleFactor}×`} color="violet" icon={<Maximize className="w-4 h-4 md:w-5 md:h-5" />} delay={0.4} />
          </div>

          {/* Details Accordion */}
          <div className="mt-6 md:mt-8">
            <Accordion type="single" collapsible>
              <AccordionItem value="details" className="glass rounded-2xl border-border/50 px-4 md:px-6 overflow-hidden">
                <AccordionTrigger className="text-sm font-semibold hover:no-underline py-4">Image Details</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pb-4">
                    <div className="space-y-2.5 md:space-y-3">
                      <DetailRow label="Original Dimensions" value={`${originalDimensions[0]} × ${originalDimensions[1]} px`} />
                      <DetailRow label="Enhanced Dimensions" value={`${enhancedDimensions[0]} × ${enhancedDimensions[1]} px`} />
                      <DetailRow label="Original File Size" value={`${fileSizeMB} MB`} />
                    </div>
                    <div className="space-y-2.5 md:space-y-3">
                      <DetailRow label="Enhanced File Size" value={`~${enhancedSizeMB} MB`} />
                      <DetailRow label="Model" value={model.toUpperCase()} />
                      <DetailRow label="Processed At" value={formattedTime} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* AI Analysis */}
          <AiAnalysis imageBase64={displayEnhancedUrl} initialAnalysis={analysis} />

          {/* Map Overlay */}
          {result.location && (
            <MapOverlay
              lat={result.location.lat}
              lng={result.location.lng}
              imageUrl={displayEnhancedUrl}
              label={result.location.label}
            />
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 md:mt-10">
            <AnimatedDownloadButton onClick={handleDownload} />
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto rounded-xl btn-press"
              onClick={handleDownloadReport}
              disabled={generatingReport}
            >
              {generatingReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
              {generatingReport ? "Generating…" : "Download Report"}
            </Button>
            <Button variant="outline" asChild size="lg" className="w-full sm:w-auto rounded-xl btn-press">
              <Link to="/enhance">
                <ArrowLeft className="w-4 h-4 mr-2" /> Enhance Another
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto rounded-xl btn-press"
              onClick={handleSharpen}
              disabled={sharpening}
              aria-label={sharpenedUrl ? "Remove sharpening" : "Apply sharpening"}
            >
              {sharpening ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {sharpening ? "Sharpening…" : sharpenedUrl ? "Remove Sharpen" : "Sharpen Image"}
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-xl btn-press" onClick={() => setShowBicubic((v) => !v)} aria-label={showBicubic ? "Hide bicubic comparison" : "Show bicubic comparison"}>
              <BarChart3 className="w-4 h-4 mr-2" />
              {showBicubic ? "Hide Bicubic" : "Compare with Bicubic"}
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center text-xs md:text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-mono text-foreground">{value}</span>
  </div>
);

export default Results;
