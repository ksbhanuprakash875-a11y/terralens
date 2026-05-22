import { memo, useState, useCallback } from "react";
import { Download, Maximize2, Clock, Ruler, Cpu, Calendar, FileText, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ResultsSlider from "@/components/ResultsSlider";
import RadialMetric from "@/components/RadialMetric";
import { generateEnhancementReport } from "@/utils/generateReport";
import { toast } from "sonner";

export interface HistoryDetailItem {
  id: string;
  file_name: string;
  file_size: number;
  model: string;
  scale_factor: string;
  original_dimensions: number[];
  enhanced_dimensions: number[];
  psnr: number | null;
  ssim: number | null;
  processing_time: number | null;
  created_at: string;
  original_image_url: string | null;
  sr_image_url: string | null;
  analysis: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface HistoryDetailProps {
  item: HistoryDetailItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadToResults?: (item: HistoryDetailItem) => void;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = `enhanced_${filename}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const HistoryDetail = memo(({ item, open, onOpenChange, onLoadToResults }: HistoryDetailProps) => {
  const [generatingReport, setGeneratingReport] = useState(false);

  const handleDownloadReport = useCallback(async () => {
    if (!item) return;
    setGeneratingReport(true);
    try {
      const blob = await generateEnhancementReport({
        fileName: item.file_name,
        model: item.model,
        scaleFactor: item.scale_factor,
        originalDimensions: item.original_dimensions as [number, number],
        enhancedDimensions: item.enhanced_dimensions as [number, number],
        metrics: {
          psnr: item.psnr ?? 0,
          ssim: item.ssim ?? 0,
          processing_time: item.processing_time ?? 0,
        },
        analysis: item.analysis ?? undefined,
        timestamp: item.created_at,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${item.file_name.replace(/\.[^.]+$/, "")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded!");
    } catch (err) {
      console.error("Report generation failed:", err);
      toast.error("Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  }, [item]);

  if (!item) return null;

  const hasImages = item.original_image_url && item.sr_image_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold truncate">{item.file_name}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            {new Date(item.created_at).toLocaleString()}
            <span className="mx-1">·</span>
            <Cpu className="w-3 h-3" />
            {item.model} · {item.scale_factor}×
          </DialogDescription>
        </DialogHeader>

        {/* Before/After Slider */}
        {hasImages && (
          <div className="mt-2">
            <ResultsSlider
              originalSrc={item.original_image_url!}
              enhancedSrc={item.sr_image_url!}
            />
          </div>
        )}

        {/* Metrics */}
        {(item.psnr != null || item.ssim != null || item.processing_time != null) && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {item.psnr != null && (
              <RadialMetric
                value={item.psnr}
                max={50}
                label="PSNR"
                displayValue={`${item.psnr.toFixed(1)} dB`}
                color="cyan"
                icon={<Ruler className="w-4 h-4" />}
              />
            )}
            {item.ssim != null && (
              <RadialMetric
                value={item.ssim}
                max={1}
                label="SSIM"
                displayValue={item.ssim.toFixed(3)}
                color="violet"
                icon={<Maximize2 className="w-4 h-4" />}
              />
            )}
            {item.processing_time != null && (
              <RadialMetric
                value={item.processing_time}
                max={30}
                label="Time"
                displayValue={`${item.processing_time.toFixed(1)}s`}
                color="cyan"
                icon={<Clock className="w-4 h-4" />}
              />
            )}
          </div>
        )}

        {/* Dimensions info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
          <span>Original: {item.original_dimensions[0]}×{item.original_dimensions[1]}</span>
          <span>Enhanced: {item.enhanced_dimensions[0]}×{item.enhanced_dimensions[1]}</span>
          <span>{(item.file_size / 1024).toFixed(0)} KB</span>
        </div>

        {/* AI Analysis */}
        {item.analysis && (
          <div className="glass rounded-xl p-4 mt-3">
            <h3 className="text-xs font-semibold text-foreground mb-2">AI Analysis</h3>
            <div className="text-xs text-muted-foreground space-y-1 leading-relaxed">
              {item.analysis.split("\n").map((line, i) => {
                if (line.startsWith("## ")) return <h4 key={i} className="text-foreground font-medium mt-2">{line.replace("## ", "")}</h4>;
                if (line.startsWith("- ")) return <li key={i} className="ml-3">{line.replace("- ", "")}</li>;
                if (line.trim() === "") return null;
                return <p key={i}>{line}</p>;
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {item.sr_image_url && (
            <Button
              onClick={() => triggerDownload(item.sr_image_url!, item.file_name)}
              className="rounded-xl btn-gradient text-primary-foreground font-semibold flex-1"
            >
              <Download className="w-4 h-4 mr-1.5" /> Download Enhanced
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleDownloadReport}
            disabled={generatingReport}
            className="rounded-xl"
          >
            {generatingReport ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}
            {generatingReport ? "Generating…" : "Report"}
          </Button>
          {onLoadToResults && hasImages && (
            <Button
              variant="outline"
              onClick={() => onLoadToResults(item)}
              className="rounded-xl"
            >
              <Maximize2 className="w-4 h-4 mr-1.5" /> Full View
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

HistoryDetail.displayName = "HistoryDetail";

export default HistoryDetail;
