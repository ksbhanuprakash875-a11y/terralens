import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface AiAnalysisProps {
  imageBase64: string;
  initialAnalysis?: string;
}

export default function AiAnalysis({ imageBase64, initialAnalysis }: AiAnalysisProps) {
  const [analysis, setAnalysis] = useState<string | null>(initialAnalysis || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "analyze-image",
        { body: { imageBase64 } }
      );

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setAnalysis(data.analysis);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Analysis failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 md:mt-8">
      <AnimatePresence mode="wait">
        {!analysis && !loading && (
          <motion.div
            key="trigger"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center"
          >
            <Button
              onClick={handleAnalyze}
              variant="outline"
              size="lg"
              className="rounded-xl btn-press gap-2 border-primary/30 hover:border-primary/60"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              AI Analysis
            </Button>
          </motion.div>
        )}

        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl p-6 text-center"
          >
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Analyzing satellite imagery with AI...
            </p>
          </motion.div>
        )}

        {error && !loading && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl p-5 border-destructive/30"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-destructive font-medium">{error}</p>
                <Button
                  onClick={handleAnalyze}
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs"
                >
                  Try again
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {analysis && !loading && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5 md:p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                AI Image Analysis
              </h3>
            </div>
            <div className="prose prose-sm prose-invert max-w-none text-muted-foreground [&_h2]:text-foreground [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_li]:text-xs [&_p]:text-xs [&_ul]:space-y-1">
              {analysis.split("\n").map((line, i) => {
                if (line.startsWith("## ")) {
                  return (
                    <h2 key={i}>{line.replace("## ", "")}</h2>
                  );
                }
                if (line.startsWith("- ")) {
                  return <li key={i}>{line.replace("- ", "")}</li>;
                }
                if (line.trim() === "") return null;
                return <p key={i}>{line}</p>;
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-border/30 flex justify-end">
              <Button
                onClick={handleAnalyze}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
              >
                <Sparkles className="w-3 h-3 mr-1" /> Re-analyze
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
