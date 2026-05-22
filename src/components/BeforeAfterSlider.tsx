import { memo, useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";

const BeforeAfterSlider = memo(() => {
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
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-16"
        >
          <h2 className="text-2xl md:text-4xl font-bold mb-4">
            Visual <span className="gradient-text">Comparison</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm md:text-base">
            Drag the slider to see the difference AI enhancement makes
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div
            ref={containerRef}
            role="slider"
            aria-label="Before and after image comparison slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(position)}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="relative aspect-[16/10] rounded-2xl overflow-hidden glass cursor-ew-resize select-none touch-none"
            onMouseMove={handleMouseMove}
            onMouseDown={(e) => handleMove(e.clientX)}
            onTouchMove={handleTouchMove}
            onTouchStart={(e) => handleMove(e.touches[0].clientX)}
          >
            {/* Before — blurred satellite image */}
            <img
              src="/samples/sat-earth-view.jpg"
              alt="Low-resolution satellite imagery"
              className="absolute inset-0 w-full h-full object-cover blur-[4px] scale-[1.03]"
              draggable={false}
            />
            <div className="absolute inset-0 bg-background/20" />

            {/* After — sharp satellite image */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 0 0 ${position}%)` }}
            >
              <img
                src="/samples/sat-earth-view.jpg"
                alt="AI-enhanced satellite imagery"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
            </div>

            {/* Divider */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-primary glow-cyan z-10"
              style={{ left: `${position}%` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass border-2 border-primary flex items-center justify-center glow-cyan-sm">
                <span className="text-primary text-xs" aria-hidden="true">⟷</span>
              </div>
            </div>

            {/* Labels */}
            <div className="absolute top-3 left-3 px-2 py-0.5 md:px-3 md:py-1 rounded-full glass text-[10px] md:text-xs font-mono text-muted-foreground">
              Low Resolution
            </div>
            <div className="absolute top-3 right-3 px-2 py-0.5 md:px-3 md:py-1 rounded-full glass text-[10px] md:text-xs font-mono text-primary">
              Super-Resolved
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

BeforeAfterSlider.displayName = "BeforeAfterSlider";

export default BeforeAfterSlider;
