import { useState, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut, Move } from "lucide-react";

interface LightboxProps {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}

const ImageLightbox = memo(({ src, alt, open, onClose }: LightboxProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const resetView = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleClose = () => {
    resetView();
    onClose();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setDragging(true);
    lastPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - lastPos.current.x,
      y: e.clientY - lastPos.current.y,
    });
  };

  const handleMouseUp = () => setDragging(false);

  const zoomIn = () => setScale((s) => Math.min(s + 0.5, 5));
  const zoomOut = () => {
    setScale((s) => {
      const next = Math.max(s - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") handleClose();
    if (e.key === "+" || e.key === "=") zoomIn();
    if (e.key === "-") zoomOut();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md"
          onClick={handleClose}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox viewer"
          tabIndex={0}
        >
          <div
            className="absolute top-4 right-4 flex items-center gap-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={zoomIn} className="w-9 h-9 rounded-lg glass flex items-center justify-center text-foreground hover:text-primary transition-colors btn-press" aria-label="Zoom in">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={zoomOut} className="w-9 h-9 rounded-lg glass flex items-center justify-center text-foreground hover:text-primary transition-colors btn-press" aria-label="Zoom out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-muted-foreground px-2" aria-live="polite">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={handleClose} className="w-9 h-9 rounded-lg glass flex items-center justify-center text-foreground hover:text-destructive transition-colors btn-press" aria-label="Close lightbox">
              <X className="w-4 h-4" />
            </button>
          </div>

          {scale > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-muted-foreground glass rounded-lg px-3 py-1.5">
              <Move className="w-3 h-3" /> Drag to pan
            </div>
          )}

          <motion.img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            className="max-w-[90vw] max-h-[85vh] rounded-xl select-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
            }}
            draggable={false}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ImageLightbox.displayName = "ImageLightbox";

export default ImageLightbox;
