import { useMemo, useRef, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, BarChart3, PieChart, Download, Image, FileSpreadsheet } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { HistoryDetailItem } from "@/components/HistoryDetail";

interface EnhancementTrendsProps {
  history: HistoryDetailItem[];
}

function getModelLabel(model: string) {
  if (model.includes("gemini")) return "Gemini AI";
  if (model.includes("kie")) return "Kie AI";
  if (model.includes("esrgan") || model.includes("real")) return "Real-ESRGAN";
  return model;
}

const MODEL_COLORS = [
  "hsl(var(--primary))",
  "hsl(142 71% 45%)",
  "hsl(262 83% 58%)",
  "hsl(38 92% 50%)",
  "hsl(346 77% 50%)",
];

const EnhancementTrends = ({ history }: EnhancementTrendsProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("usage");
  const { toast } = useToast();

  const usageData = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    for (const item of history) {
      const key = item.created_at.slice(0, 10);
      if (map.has(key)) map.set(key, map.get(key)! + 1);
    }
    return Array.from(map.entries()).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" }),
      rawDate: date,
      count,
    }));
  }, [history]);

  const qualityData = useMemo(() => {
    const map = new Map<string, { psnrs: number[]; ssims: number[] }>();
    for (const item of history) {
      const key = item.created_at.slice(0, 10);
      if (!map.has(key)) map.set(key, { psnrs: [], ssims: [] });
      const entry = map.get(key)!;
      if (item.psnr != null) entry.psnrs.push(item.psnr);
      if (item.ssim != null) entry.ssims.push(item.ssim);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, { psnrs, ssims }]) => ({
        date: new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" }),
        rawDate: date,
        psnr: psnrs.length ? +(psnrs.reduce((a, b) => a + b, 0) / psnrs.length).toFixed(1) : null,
        ssim: ssims.length ? +(ssims.reduce((a, b) => a + b, 0) / ssims.length).toFixed(3) : null,
      }));
  }, [history]);

  const modelData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of history) {
      const label = getModelLabel(item.model);
      counts[label] = (counts[label] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value], i) => ({ name, value, fill: MODEL_COLORS[i % MODEL_COLORS.length] }))
      .sort((a, b) => b.value - a.value);
  }, [history]);

  const exportCSV = useCallback(() => {
    let csv = "";
    if (activeTab === "usage") {
      csv = "Date,Enhancements\n" + usageData.map(r => `${r.rawDate},${r.count}`).join("\n");
    } else if (activeTab === "quality") {
      csv = "Date,Avg PSNR,Avg SSIM\n" + qualityData.map(r => `${r.rawDate},${r.psnr ?? ""},${r.ssim ?? ""}`).join("\n");
    } else {
      csv = "Model,Count\n" + modelData.map(r => `${r.name},${r.value}`).join("\n");
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trends-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported", description: `${activeTab} data downloaded` });
  }, [activeTab, usageData, qualityData, modelData, toast]);

  const exportPNG = useCallback(async () => {
    const el = chartRef.current;
    if (!el) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(el, { backgroundColor: "#0B0F1A", scale: 2 });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `trends-${activeTab}-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      toast({ title: "PNG exported", description: "Chart image downloaded" });
    } catch {
      toast({ title: "Export failed", description: "Could not capture chart", variant: "destructive" });
    }
  }, [activeTab, toast]);

  if (history.length < 2) return null;

  const usageConfig: ChartConfig = {
    count: { label: "Enhancements", color: "hsl(var(--primary))" },
  };

  const qualityConfig: ChartConfig = {
    psnr: { label: "Avg PSNR", color: "hsl(var(--primary))" },
    ssim: { label: "Avg SSIM", color: "hsl(142 71% 45%)" },
  };

  const modelConfig: ChartConfig = Object.fromEntries(
    modelData.map((m) => [m.name, { label: m.name, color: m.fill }])
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="glass rounded-2xl p-6 mb-6 border border-border/50"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Enhancement Trends</h2>
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exportPNG} title="Export as PNG">
            <Image className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exportCSV} title="Export as CSV">
            <FileSpreadsheet className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="usage" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="usage" className="flex-1 text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Usage
          </TabsTrigger>
          <TabsTrigger value="quality" className="flex-1 text-xs gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Quality
          </TabsTrigger>
          <TabsTrigger value="models" className="flex-1 text-xs gap-1.5">
            <PieChart className="w-3.5 h-3.5" /> Models
          </TabsTrigger>
        </TabsList>

        <div ref={chartRef}>

        <TabsContent value="usage">
          <ChartContainer config={usageConfig} className="h-[220px] w-full">
            <AreaChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--color-count)"
                fill="var(--color-count)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </TabsContent>

        <TabsContent value="quality">
          {qualityData.length < 2 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Not enough quality data to display trends
            </p>
          ) : (
            <ChartContainer config={qualityConfig} className="h-[220px] w-full">
              <LineChart data={qualityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis yAxisId="psnr" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis yAxisId="ssim" orientation="right" tick={{ fontSize: 10 }} className="fill-muted-foreground" domain={[0, 1]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line yAxisId="psnr" type="monotone" dataKey="psnr" stroke="var(--color-psnr)" strokeWidth={2} dot={false} connectNulls />
                <Line yAxisId="ssim" type="monotone" dataKey="ssim" stroke="var(--color-ssim)" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ChartContainer>
          )}
        </TabsContent>

        <TabsContent value="models">
          <div className="h-[220px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={modelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {modelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {modelData.map((m) => (
              <div key={m.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: m.fill }} />
                {m.name} ({m.value})
              </div>
            ))}
          </div>
        </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  );
};

export default EnhancementTrends;
