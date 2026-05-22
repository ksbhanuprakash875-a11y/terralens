import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ImageIcon, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BenchmarkImage {
  id: string;
  name: string;
  description: string | null;
  category: string;
  low_res_url: string;
  high_res_url: string;
}

interface SampleImagesProps {
  onSelect: (file: File, benchmarkId?: string, groundTruthUrl?: string) => void;
  disabled?: boolean;
}

export default function SampleImages({ onSelect, disabled }: SampleImagesProps) {
  const [benchmarks, setBenchmarks] = useState<BenchmarkImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("benchmark_images")
      .select("id, name, description, category, low_res_url, high_res_url")
      .order("name")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setBenchmarks(data);
        }
        setLoading(false);
      });
  }, []);

  const handleClick = async (benchmark: BenchmarkImage) => {
    if (disabled) return;
    try {
      const res = await fetch(benchmark.low_res_url);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `benchmark-${benchmark.name.toLowerCase().replace(/\s/g, "-")}.png`,
        { type: "image/png" }
      );
      onSelect(file, benchmark.id, benchmark.high_res_url);
    } catch {
      // silently fail
    }
  };

  if (loading || benchmarks.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Benchmark samples (with ground-truth metrics)
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {benchmarks.map((b) => (
          <motion.button
            key={b.id}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleClick(b)}
            disabled={disabled}
            className="group relative aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <img
              src={b.low_res_url}
              alt={b.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
              <span className="text-[10px] font-semibold text-foreground leading-tight text-center">
                {b.name}
              </span>
              <span className="text-[8px] text-primary font-mono">BENCHMARK</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
