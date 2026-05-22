import { memo } from "react";
import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface RadialMetricProps {
  value: number;
  max: number;
  label: string;
  displayValue: string;
  color: "cyan" | "violet";
  icon: React.ReactNode;
  delay?: number;
}

const RadialMetric = memo(({
  value,
  max,
  label,
  displayValue,
  color,
  icon,
  delay = 0,
}: RadialMetricProps) => {
  const progress = Math.min(value / max, 1);
  const circumference = 2 * Math.PI * 36;
  const motionValue = useMotionValue(0);
  const strokeDashoffset = useTransform(
    motionValue,
    [0, 1],
    [circumference, circumference * (1 - progress)]
  );

  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(0, 1, {
      duration: 1.2,
      delay,
      ease: "easeOut",
      onUpdate: (v) => motionValue.set(v),
    });
    return controls.stop;
  }, [delay, motionValue]);

  useEffect(() => {
    const numericMatch = displayValue.match(/[\d.]+/);
    if (!numericMatch || !countRef.current) return;
    const target = parseFloat(numericMatch[0]);
    const suffix = displayValue.replace(numericMatch[0], "");

    const controls = animate(0, target, {
      duration: 1.2,
      delay,
      ease: "easeOut",
      onUpdate: (v) => {
        if (countRef.current) {
          countRef.current.textContent =
            (target >= 10 ? v.toFixed(1) : v.toFixed(2)) + suffix;
        }
      },
    });
    return controls.stop;
  }, [displayValue, delay]);

  const strokeColor = color === "cyan" ? "hsl(187 100% 50%)" : "hsl(263 75% 52%)";
  const trackColor = color === "cyan" ? "hsl(187 100% 50% / 0.15)" : "hsl(263 75% 52% / 0.15)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="glass rounded-2xl p-4 md:p-5 flex flex-col items-center text-center"
      role="group"
      aria-label={`${label}: ${displayValue}`}
    >
      <div className="relative w-16 h-16 md:w-20 md:h-20 mb-2 md:mb-3" aria-hidden="true">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke={trackColor} strokeWidth="5" />
          <motion.circle cx="40" cy="40" r="36" fill="none" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} style={{ strokeDashoffset }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      </div>
      <span ref={countRef} className="text-base md:text-lg font-bold font-mono text-foreground">
        {displayValue}
      </span>
      <span className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{label}</span>
    </motion.div>
  );
});

RadialMetric.displayName = "RadialMetric";

export default RadialMetric;
