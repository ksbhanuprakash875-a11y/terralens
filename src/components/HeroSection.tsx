import { memo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import HeroSlider from "@/components/HeroSlider";

const HeroSection = memo(() => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-1">
      {/* Animated background */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted" />

        {/* Light-mode texture overlay */}
        <div className="absolute inset-0 light-texture" />

        {/* Glow orbs — adapted for both themes */}
        <div className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 rounded-full blur-[120px] animate-pulse-glow bg-primary/10" />
        <div className="absolute bottom-1/4 right-1/4 w-56 md:w-80 h-56 md:h-80 rounded-full blur-[120px] animate-pulse-glow bg-secondary/10" style={{ animationDelay: "1.5s" }} />
        {/* Extra light-mode accent — soft cyan top wash */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[160px] bg-primary/[0.03] light-texture-wash" />

        {/* Stars (dark mode only, hidden in light) */}
        <div className="light-hide-stars">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-px h-px bg-foreground/60 rounded-full animate-pulse-glow"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 3 + 2}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full glass text-xs font-mono text-primary mb-6">
              ESRGAN-Powered Super-Resolution
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-tight mb-6"
          >
            Enhance Satellite{" "}
            <span className="gradient-text">Imagery with AI</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-base sm:text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            ESRGAN-powered 4× super-resolution for micro-region analysis.
            Transform blurry satellite captures into crystal-clear imagery.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
          >
            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan rounded-xl px-8 py-6 text-base font-semibold btn-press"
            >
              <Link to="/enhance" aria-label="Try TerraLens image enhancement">
                Try It Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>

          {/* Interactive before/after slider */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-12 md:mt-16"
          >
            <div className="glass rounded-2xl p-1.5 max-w-2xl mx-auto glow-cyan-sm">
              <HeroSlider
                beforeSrc="/samples/sat-city-night.jpg"
                afterSrc="/samples/sat-city-night.jpg"
              />
            </div>
            <p className="text-[11px] text-muted-foreground/60 font-mono mt-3">
              ← Drag to compare · Satellite imagery
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = "HeroSection";

export default HeroSection;
