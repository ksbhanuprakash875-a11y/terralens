import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Zap, Calendar, Crown, Gift } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import UpgradeModal from "@/components/UpgradeModal";

export interface UserCredits {
  credits_remaining: number;
  credits_used: number;
  period_end: string;
  plan?: string;
}

interface ModelBreakdown {
  model: string;
  count: number;
}

interface UsageStatsProps {
  credits: UserCredits | null;
  modelBreakdown: ModelBreakdown[];
  totalEnhancements: number;
  avgPsnr: number | null;
  avgSsim: number | null;
  onCreditsRefresh?: () => void;
}

const TOTAL_CREDITS = 50;
const PRO_CREDITS = 150;

function getModelLabel(model: string) {
  if (model.includes("gemini")) return "Gemini AI";
  if (model.includes("kie")) return "Kie AI";
  if (model.includes("esrgan") || model.includes("real")) return "Real-ESRGAN";
  return model;
}

function getModelColor(model: string) {
  if (model.includes("gemini")) return "bg-purple-500";
  if (model.includes("kie")) return "bg-emerald-500";
  return "bg-blue-500";
}

const UsageStats = ({ credits, modelBreakdown, totalEnhancements, avgPsnr, avgSsim, onCreditsRefresh }: UsageStatsProps) => {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  if (!credits) return null;

  const isPro = credits.plan === "pro";
  const totalCredits = isPro ? PRO_CREDITS : TOTAL_CREDITS;
  const usedPercent = Math.round((credits.credits_used / totalCredits) * 100);
  const remainPercent = Math.round((credits.credits_remaining / totalCredits) * 100);
  const resetDate = new Date(credits.period_end);
  const maxModelCount = Math.max(...modelBreakdown.map((m) => m.count), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="glass rounded-2xl p-6 mb-6 border border-border/50"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Usage & Credits</h2>
          {isPro && (
            <span className="text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
              <Crown className="w-3 h-3" /> PRO
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Resets {resetDate.toLocaleDateString()}
        </span>
      </div>

      {/* Credits bar */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            <span className="text-2xl font-bold text-primary">{credits.credits_remaining}</span>
            <span className="text-muted-foreground"> / {totalCredits} credits</span>
          </span>
          <span className="text-xs text-muted-foreground">{credits.credits_used} used</span>
        </div>
        <Progress
          value={remainPercent}
          className="h-3 bg-muted/50"
        />
        {credits.credits_remaining <= 10 && (
          <p className="text-[11px] text-destructive mt-1.5">
            {credits.credits_remaining === 0
              ? "No credits remaining — resets on " + resetDate.toLocaleDateString()
              : `Only ${credits.credits_remaining} credits left this period`}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full text-xs"
          onClick={() => setUpgradeOpen(true)}
        >
          <Gift className="w-3.5 h-3.5 mr-1.5" />
          Get More Credits
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl bg-muted/30 border border-border/30 p-3 text-center">
          <p className="text-xl font-bold text-foreground">{totalEnhancements}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Enhancements</p>
        </div>
        <div className="rounded-xl bg-muted/30 border border-border/30 p-3 text-center">
          <p className="text-xl font-bold text-foreground">{avgPsnr?.toFixed(1) ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Avg PSNR</p>
        </div>
        <div className="rounded-xl bg-muted/30 border border-border/30 p-3 text-center">
          <p className="text-xl font-bold text-foreground">{avgSsim?.toFixed(3) ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Avg SSIM</p>
        </div>
      </div>

      {/* Model breakdown */}
      {modelBreakdown.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Model Breakdown</span>
          </div>
          <div className="space-y-2">
            {modelBreakdown.map((item) => (
              <div key={item.model} className="flex items-center gap-3">
                <span className="text-[11px] text-foreground w-24 truncate">{getModelLabel(item.model)}</span>
                <div className="flex-1 h-5 rounded-full bg-muted/30 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.count / maxModelCount) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className={`h-full rounded-full ${getModelColor(item.model)}`}
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground w-8 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} onRedeemed={onCreditsRefresh} />
    </motion.div>
  );
};

export default UsageStats;
