import { useState, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/* ─── Category data ─── */
const categories = [
  { id: "all", label: "All" },
  { id: "urban", label: "Urban" },
  { id: "coastal", label: "Coastal" },
  { id: "forest", label: "Forest" },
  { id: "desert", label: "Desert" },
  { id: "mountain", label: "Mountain" },
  { id: "agricultural", label: "Agricultural" },
] as const;

interface GalleryEntry {
  id: string;
  label: string;
  category: string;
  /** The sharp satellite image */
  srImage: string;
  /** Same image shown blurred as the "before" */
  lrImage: string;
  description: string;
}

const galleryEntries: GalleryEntry[] = [
  {
    id: "urban-1",
    label: "Urban Aerial",
    category: "urban",
    srImage: "/samples/sat-urban-aerial.jpg",
    lrImage: "/samples/sat-urban-aerial.jpg",
    description: "Dense urban grid with roads, buildings, and infrastructure clearly resolved.",
  },
  {
    id: "urban-2",
    label: "City at Night",
    category: "urban",
    srImage: "/samples/sat-city-night.jpg",
    lrImage: "/samples/sat-city-night.jpg",
    description: "Night-time city lights revealing road networks and development patterns.",
  },
  {
    id: "coastal-1",
    label: "Coastal Shoreline",
    category: "coastal",
    srImage: "/samples/sat-coastal.jpg",
    lrImage: "/samples/sat-coastal.jpg",
    description: "Coastline details — wave patterns, sand bars, and vegetation boundaries.",
  },
  {
    id: "coastal-2",
    label: "Coastal Gallery",
    category: "coastal",
    srImage: "/samples/gallery-coastal.jpg",
    lrImage: "/samples/gallery-coastal.jpg",
    description: "Aerial coastal view showing water-land interface at high resolution.",
  },
  {
    id: "forest-1",
    label: "Dense Forest",
    category: "forest",
    srImage: "/samples/sat-forest.jpg",
    lrImage: "/samples/sat-forest.jpg",
    description: "Canopy texture and tree density visible after super-resolution enhancement.",
  },
  {
    id: "forest-2",
    label: "Forest Canopy",
    category: "forest",
    srImage: "/samples/gallery-forest.jpg",
    lrImage: "/samples/gallery-forest.jpg",
    description: "Detailed forest coverage with distinct tree-level features recovered.",
  },
  {
    id: "desert-1",
    label: "Arid Desert",
    category: "desert",
    srImage: "/samples/sat-desert.jpg",
    lrImage: "/samples/sat-desert.jpg",
    description: "Sand dune formations and terrain texture enhanced from blurred source.",
  },
  {
    id: "desert-2",
    label: "Desert Landscape",
    category: "desert",
    srImage: "/samples/gallery-desert.jpg",
    lrImage: "/samples/gallery-desert.jpg",
    description: "Wide desert terrain with geological formations and erosion patterns.",
  },
  {
    id: "mountain-1",
    label: "Mountain Range",
    category: "mountain",
    srImage: "/samples/sat-mountain.jpg",
    lrImage: "/samples/sat-mountain.jpg",
    description: "Mountain ridgelines, snow coverage, and valley features sharpened.",
  },
  {
    id: "mountain-2",
    label: "Highland Terrain",
    category: "mountain",
    srImage: "/samples/gallery-mountain.jpg",
    lrImage: "/samples/gallery-mountain.jpg",
    description: "Elevation changes and rocky terrain resolved from satellite view.",
  },
  {
    id: "agricultural-1",
    label: "Farmland",
    category: "agricultural",
    srImage: "/samples/sat-agricultural.jpg",
    lrImage: "/samples/sat-agricultural.jpg",
    description: "Crop field boundaries and irrigation patterns clearly delineated.",
  },
  {
    id: "agricultural-2",
    label: "Agricultural Plots",
    category: "agricultural",
    srImage: "/samples/gallery-agricultural.jpg",
    lrImage: "/samples/gallery-agricultural.jpg",
    description: "Organized agricultural land with different crop types distinguishable.",
  },
];

/* ─── Inline Before/After Slider ─── */
const CompareSlider = memo(({ entry }: { entry: GalleryEntry }) => {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square rounded-xl overflow-hidden cursor-col-resize select-none"
      onMouseDown={(e) => handleMove(e.clientX)}
      onMouseMove={(e) => { if (e.buttons === 1) handleMove(e.clientX); }}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      role="slider"
      aria-label={`Compare before and after for ${entry.label}`}
      aria-valuenow={Math.round(position)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 2));
        if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 2));
      }}
    >
      {/* After (sharp) — full background */}
      <img
        src={entry.srImage}
        alt={`${entry.label} — enhanced`}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />

      {/* Before (blurred) — clipped */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={entry.lrImage}
          alt={`${entry.label} — original`}
          className="absolute inset-0 w-full h-full object-cover blur-[6px] scale-110"
          style={{ width: `${100 / (position / 100)}%`, maxWidth: "none" }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-background/30" />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-primary-foreground">
            <path d="M4 7H1M10 7H13M4 7L6 5M4 7L6 9M10 7L8 5M10 7L8 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-3 left-3 text-[10px] font-mono bg-background/70 backdrop-blur-sm px-2 py-0.5 rounded-full text-muted-foreground">
        Before
      </span>
      <span className="absolute top-3 right-3 text-[10px] font-mono bg-background/70 backdrop-blur-sm px-2 py-0.5 rounded-full text-primary">
        After ✨
      </span>
    </div>
  );
});

CompareSlider.displayName = "CompareSlider";

/* ─── Animation ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

/* ─── Gallery Page ─── */
const Gallery = () => {
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered =
    activeCategory === "all"
      ? galleryEntries
      : galleryEntries.filter((e) => e.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="max-w-[1100px] mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-3xl md:text-5xl font-extrabold mb-3">
              <span className="gradient-text">Gallery</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
              Before & after comparisons of AI-enhanced satellite imagery — drag the slider to reveal
            </p>
          </motion.div>

          {/* Category filters */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap justify-center gap-2 mb-10"
          >
            {categories.map((cat) => {
              const count =
                cat.id === "all"
                  ? galleryEntries.length
                  : galleryEntries.filter((e) => e.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeCategory === cat.id
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground bg-muted/30 border border-border/50 hover:border-border"
                  }`}
                >
                  {cat.label}
                  <span className="ml-1.5 text-[10px] opacity-60">{count}</span>
                </button>
              );
            })}
          </motion.div>

          {/* Grid */}
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((entry) => (
                <motion.div
                  key={entry.id}
                  layout
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 transition-colors group"
                >
                  <CompareSlider entry={entry} />

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-sm font-semibold text-foreground">{entry.label}</h3>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full capitalize">
                        {entry.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {entry.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Eye className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No samples in this category</p>
            </div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-14"
          >
            <p className="text-muted-foreground text-sm mb-4">
              Want to see your own images enhanced?
            </p>
            <a
              href="/enhance"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-gradient text-primary-foreground font-semibold shimmer glow-cyan transition-all"
            >
              Try It Now →
            </a>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Gallery;
