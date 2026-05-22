import { memo, useCallback, useRef, useState } from "react";

const HeroSlider = memo(({ beforeSrc, afterSrc }: { beforeSrc: string; afterSrc: string }) => {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 2));
    else if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 2));
  }, []);

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label="Before and after satellite image comparison"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative aspect-[16/10] rounded-xl overflow-hidden cursor-ew-resize select-none touch-none"
    >
      {/* Before — blurred / low-res */}
      <img
        src={beforeSrc}
        alt="Low-resolution satellite view"
        className="absolute inset-0 w-full h-full object-cover blur-[4px] scale-[1.03]"
        draggable={false}
      />
      <div className="absolute inset-0 bg-background/20" />

      {/* After — sharp / enhanced */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      >
        <img
          src={afterSrc}
          alt="AI-enhanced satellite view"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-primary z-10 shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm border-2 border-primary flex items-center justify-center shadow-[0_0_12px_hsl(var(--primary)/0.4)]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary">
            <path d="M4 8H12M4 8L6 6M4 8L6 10M12 8L10 6M12 8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-background/70 backdrop-blur-sm text-[10px] font-mono text-muted-foreground border border-border/40">
        Before · Low-Res
      </div>
      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-background/70 backdrop-blur-sm text-[10px] font-mono text-primary border border-primary/30">
        After · 4× Enhanced
      </div>
    </div>
  );
});

HeroSlider.displayName = "HeroSlider";
export default HeroSlider;
