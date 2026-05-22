import { memo, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface ResultsSliderProps {
  originalSrc: string;
  enhancedSrc: string;
}

const ResultsSlider = memo(({ originalSrc, enhancedSrc }: ResultsSliderProps) => {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (e.buttons !== 1) return;
      handleMove(e.clientX);
    },
    [handleMove]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => handleMove(e.touches[0].clientX),
    [handleMove]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 2));
    else if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 2));
  }, []);

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label="Before and after comparison slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden cursor-ew-resize select-none glass touch-none"
      onMouseMove={handleMouseMove}
      onMouseDown={(e) => handleMove(e.clientX)}
      onTouchMove={handleTouchMove}
      onTouchStart={(e) => handleMove(e.touches[0].clientX)}
    >
      <div className="absolute inset-0">
        <img src={originalSrc} alt="Original image" className="w-full h-full object-contain bg-muted/40" draggable={false} />
      </div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${position}%)` }}>
        <img src={enhancedSrc} alt="Enhanced image" className="w-full h-full object-contain bg-muted/20" draggable={false} style={{ filter: "contrast(1.05) saturate(1.1)" }} />
      </div>
      <div className="absolute top-0 bottom-0 w-0.5 bg-primary glow-cyan z-10" style={{ left: `${position}%` }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass border-2 border-primary flex items-center justify-center glow-cyan-sm">
          <span className="text-primary text-xs font-bold" aria-hidden="true">⟷</span>
        </div>
      </div>
      <div className="absolute top-3 left-3 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full bg-destructive/20 border border-destructive/30 text-[10px] md:text-xs font-mono text-destructive-foreground">
        Original
      </div>
      <div className="absolute top-3 right-3 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] md:text-xs font-mono text-emerald-400">
        Enhanced
      </div>
    </div>
  );
});

ResultsSlider.displayName = "ResultsSlider";

export default ResultsSlider;
