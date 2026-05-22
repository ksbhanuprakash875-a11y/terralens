import { memo } from "react";
import { motion } from "framer-motion";
import { CloudUpload, Sparkles, Download } from "lucide-react";

const steps = [
  {
    icon: CloudUpload,
    title: "Upload",
    description: "Upload a low-res satellite image",
    step: 1,
  },
  {
    icon: Sparkles,
    title: "Enhance",
    description: "AI processes it through ESRGAN",
    step: 2,
  },
  {
    icon: Download,
    title: "Download",
    description: "Get your 4× enhanced image",
    step: 3,
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.2 } },
};

const item = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const HowItWorks = memo(() => {
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
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm md:text-base">
            Three simple steps to transform your satellite imagery
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto"
        >
          {steps.map((s) => (
            <motion.div
              key={s.step}
              variants={item}
              className="card-tilt glass rounded-2xl p-6 md:p-8 text-center group hover:border-primary/30 transition-colors"
            >
              <div
                className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl bg-primary/10 text-primary mb-4 md:mb-5 group-hover:glow-cyan-sm transition-shadow"
                aria-hidden="true"
              >
                <s.icon className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono mb-3">
                Step {s.step}
              </div>
              <h3 className="text-base md:text-lg font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
});

HowItWorks.displayName = "HowItWorks";

export default HowItWorks;
