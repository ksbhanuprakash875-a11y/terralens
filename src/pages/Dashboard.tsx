import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  History, Trash2, Rocket, User, LogOut, ImageIcon, Calendar,
  Loader2, ChevronDown, ChevronUp, Download, Eye, MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEnhance, type EnhanceResult } from "@/context/EnhanceContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import HistoryDetail, { type HistoryDetailItem } from "@/components/HistoryDetail";
import UsageStats, { type UserCredits } from "@/components/UsageStats";
import EnhancementTrends from "@/components/EnhancementTrends";

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setResult, setStatus } = useEnhance();

  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [history, setHistory] = useState<HistoryDetailItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HistoryDetailItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [credits, setCredits] = useState<UserCredits | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  const refreshCredits = useCallback(() => {
    if (!user) return;
    supabase.rpc("maybe_reset_credits", { p_user_id: user.id }).then(() => {
      supabase
        .from("user_credits")
        .select("credits_remaining, credits_used, period_end, plan")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setCredits(data as UserCredits);
        });
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refreshCredits();

    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
      });

    supabase
      .from("enhancement_history")
      .select("id, file_name, file_size, model, scale_factor, original_dimensions, enhanced_dimensions, psnr, ssim, processing_time, created_at, sr_image_url, original_image_url, analysis, latitude, longitude")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setHistory((data as HistoryDetailItem[]) || []);
        setLoadingHistory(false);
      });
  }, [user]);

  // Compute stats from history for current period
  const { modelBreakdown, totalEnhancements, avgPsnr, avgSsim } = useMemo(() => {
    if (!credits) return { modelBreakdown: [], totalEnhancements: 0, avgPsnr: null, avgSsim: null };
    const periodStart = new Date(credits.period_end);
    periodStart.setMonth(periodStart.getMonth() - 1);
    
    const periodItems = history.filter((h) => new Date(h.created_at) >= periodStart);
    
    const counts: Record<string, number> = {};
    let psnrSum = 0, psnrCount = 0, ssimSum = 0, ssimCount = 0;
    
    for (const item of periodItems) {
      counts[item.model] = (counts[item.model] || 0) + 1;
      if (item.psnr != null) { psnrSum += item.psnr; psnrCount++; }
      if (item.ssim != null) { ssimSum += item.ssim; ssimCount++; }
    }
    
    return {
      modelBreakdown: Object.entries(counts)
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count),
      totalEnhancements: periodItems.length,
      avgPsnr: psnrCount > 0 ? psnrSum / psnrCount : null,
      avgSsim: ssimCount > 0 ? ssimSum / ssimCount : null,
    };
  }, [history, credits]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Profile updated" });
    }
  };

  const deleteHistoryItem = async (id: string) => {
    const { error } = await supabase.from("enhancement_history").delete().eq("id", id);
    if (!error) {
      setHistory((h) => h.filter((item) => item.id !== id));
      toast({ title: "Removed from history" });
    }
  };

  const triggerDownload = useCallback((url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `enhanced_${filename}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const loadToResults = useCallback((item: HistoryDetailItem) => {
    const result: EnhanceResult = {
      srImageUrl: item.sr_image_url!,
      originalImage: item.original_image_url!,
      metrics: {
        psnr: item.psnr ?? 0,
        ssim: item.ssim ?? 0,
        processing_time: item.processing_time ?? 0,
      },
      originalDimensions: [item.original_dimensions[0], item.original_dimensions[1]],
      enhancedDimensions: [item.enhanced_dimensions[0], item.enhanced_dimensions[1]],
      fileName: item.file_name,
      fileSize: item.file_size,
      model: item.model,
      scaleFactor: item.scale_factor,
      timestamp: item.created_at,
      analysis: item.analysis ?? undefined,
      location: item.latitude != null && item.longitude != null
        ? { lat: item.latitude, lng: item.longitude }
        : undefined,
    };
    setResult(result);
    setStatus("complete");
    navigate("/results");
  }, [setResult, setStatus, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || !user) return null;

  const visibleHistory = showAllHistory ? history : history.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="max-w-[800px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
                <span className="gradient-text">Dashboard</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="rounded-xl text-muted-foreground"
            >
              <LogOut className="w-4 h-4 mr-1.5" /> Sign out
            </Button>
          </div>

          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 mb-6 border border-border/50"
          >
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Profile</h2>
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label htmlFor="displayName" className="text-sm text-muted-foreground">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 rounded-xl bg-muted/50 border-border"
                  placeholder="Your name"
                />
              </div>
              <Button
                onClick={saveProfile}
                disabled={savingProfile}
                className="rounded-xl btn-gradient text-primary-foreground font-semibold"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </motion.div>

          {/* Usage Stats */}
          <UsageStats
            credits={credits}
            modelBreakdown={modelBreakdown}
            totalEnhancements={totalEnhancements}
            avgPsnr={avgPsnr}
            avgSsim={avgSsim}
            onCreditsRefresh={refreshCredits}
          />

          {/* Enhancement Trends */}
          <EnhancementTrends history={history} />

          {/* Enhancement History */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6 border border-border/50"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Enhancement History</h2>
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  {history.length}
                </span>
              </div>
              <Link to="/enhance">
                <Button size="sm" className="rounded-xl btn-gradient text-primary-foreground font-semibold">
                  <Rocket className="w-4 h-4 mr-1.5" /> Enhance
                </Button>
              </Link>
            </div>

            {loadingHistory ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No enhancements yet</p>
                <p className="text-xs text-muted-foreground mt-1">Your enhancement results will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {visibleHistory.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 hover:border-border/60 transition-colors"
                    >
                      {/* Thumbnail */}
                      {item.sr_image_url ? (
                        <button
                          onClick={() => { setSelectedItem(item); setDetailOpen(true); }}
                          className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-muted/50 hover:ring-2 hover:ring-primary/50 transition-all"
                        >
                          <img
                            src={item.sr_image_url}
                            alt={item.file_name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ) : (
                        <div className="shrink-0 w-14 h-14 rounded-lg bg-muted/50 flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.file_name}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {item.model} · {item.scale_factor}×
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {item.original_dimensions[0]}×{item.original_dimensions[1]} → {item.enhanced_dimensions[0]}×{item.enhanced_dimensions[1]}
                          </span>
                          {item.psnr != null && (
                            <span className="text-[11px] text-muted-foreground">
                              PSNR: {item.psnr.toFixed(1)} · SSIM: {item.ssim?.toFixed(3)}
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                          {item.latitude != null && item.longitude != null && (
                            <span className="text-[11px] text-primary flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {(item as any).latitude.toFixed(2)}, {(item as any).longitude.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setSelectedItem(item); setDetailOpen(true); }}
                          className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          aria-label="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {item.sr_image_url && (
                          <button
                            onClick={() => triggerDownload(item.sr_image_url!, item.file_name)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            aria-label="Download enhanced image"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteHistoryItem(item.id)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          aria-label="Delete from history"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {history.length > 5 && (
                  <button
                    onClick={() => setShowAllHistory(!showAllHistory)}
                    className="w-full py-2 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors"
                  >
                    {showAllHistory ? (
                      <>Show less <ChevronUp className="w-3 h-3" /></>
                    ) : (
                      <>Show all {history.length} results <ChevronDown className="w-3 h-3" /></>
                    )}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
      <Footer />

      {/* Detail Modal */}
      <HistoryDetail
        item={selectedItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onLoadToResults={loadToResults}
      />
    </div>
  );
};

export default Dashboard;
