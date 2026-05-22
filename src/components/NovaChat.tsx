import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  Bot,
  X,
  Trash2,
  Send,
  Minus,
  Leaf,
  MapPin,
  ChevronDown,
  ChevronUp,
  Clipboard,
  ClipboardCheck,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useIsMobile } from "@/hooks/use-mobile";
import "./NovaChat.css";

type Msg = { role: "user" | "assistant"; content: string; ts: number };

/* ── Quick-send starter chips ── */
const STARTERS = [
  "How does TerraLens enhance satellite imagery?",
  "What is ESRGAN and why use it for satellites?",
  "How can I analyze land use with TerraLens?",
];

/* ── Full crop analysis prompt (universal — works in ChatGPT, Gemini & Nova) ── */
const CROP_ANALYSIS_PROMPT = `You are a senior agricultural remote sensing specialist, agronomist, and GIS expert with deep expertise in Indian farming systems, tropical and subtropical crop cultivation, and multi-scale satellite image interpretation.

I am sharing a satellite or aerial image of a farm/plantation. Please analyze it thoroughly using the following structured framework:

════════════════════════════════════════
STEP 1 — GEOGRAPHIC & ENVIRONMENTAL CONTEXT
════════════════════════════════════════
Identify all visible environmental clues:
• Soil color & type → infer likely Indian state/region
  (Red/laterite → Karnataka/AP/TN | Black/dark → Maharashtra/Telangana | Sandy → Rajasthan/Gujarat | Alluvial → Indo-Gangetic Plain)
• Topography: flat plains / terraced hillside / river floodplain / plateau / valley basin
• Water features: irrigation canals / drip lines / check dams / flood furrows / rainfed
• Infrastructure: road types, building styles, cold storage, solar panels, bore wells
• Seasonal indicator: crop color (lush green = active growth | yellow = harvest stage | bare = land prep)

════════════════════════════════════════
STEP 2 — PLANTATION & FIELD STRUCTURE ANALYSIS
════════════════════════════════════════
• Row & spacing pattern:
  - Regular grid → orchard/plantation crops
  - Offset/quincunx → high-density orchard
  - Paired rows → sugarcane/banana/drip crops
  - Broadcast/random → pulses/millets/wheat
  - Raised beds/ridges → vegetables/potato/cotton
  - Contour rows → hillside tea/coffee/spices
• Estimate inter-row spacing, intra-plant spacing, planting density (plants/acre)
• Row orientation: N-S / E-W / diagonal / contour-following
• Field size: small <1 acre (smallholder) | medium 1–5 acres (semi-commercial) | large >5 acres (commercial)

════════════════════════════════════════
STEP 3 — CANOPY & VEGETATION ANALYSIS
════════════════════════════════════════
Crown/canopy shape clues:
• Feathery/pinnate star → Coconut, Arecanut, Date Palm
• Broad rounded dome → Mango, Sapota, Guava, Jackfruit
• Tall narrow column → Eucalyptus, Poplar, Arecanut
• Dense rosette/broad leaf → Banana, Papaya, Taro
• Low bushy mound → Coffee, Tea, Pomegranate, Grapes
• Linear rows (no canopy) → Sugarcane, Sorghum, Maize
• Flat continuous green → Paddy, Wheat, Groundnut, Pulses

Canopy color clues:
• Deep dark green → Coconut, Arecanut, Coffee
• Bright lime green → Banana, Paddy, Vegetables
• Grey-green/dusty → Mango, Guava, Neem, Teak
• Blue-green → Eucalyptus, Sugarcane
• Yellow-green → Maize, Sorghum, Ripening Paddy
• Silvery/pale green → Cotton (with bolls), Mustard

Shadow analysis:
• Long distinct shadows → Tall trees (coconut/arecanut/teak)
• Medium shadows → Mid-height crops (banana/papaya/maize)
• No/minimal shadows → Short crops (vegetables/pulses/paddy)

════════════════════════════════════════
STEP 4 — CROP CANDIDATE EVALUATION
════════════════════════════════════════
Evaluate each candidate against ALL observed features:

PLANTATION / TREE CROPS:
Coconut, Arecanut, Banana, Papaya, Mango, Sapota, Guava, Pomegranate, Cashew, Jackfruit, Citrus, Tamarind/Neem/Teak

SPICE & BEVERAGE CROPS:
Coffee, Tea, Pepper, Cardamom

FIELD / ANNUAL CROPS:
Paddy/Rice, Sugarcane, Cotton, Maize, Wheat/Barley, Sorghum/Jowar, Groundnut, Soybean, Sunflower, Turmeric/Ginger, Onion/Garlic, Tomato/Chilli/Brinjal

HORTICULTURAL / SPECIALTY:
Grapes (trellised rows), Strawberry (raised plastic mulch beds), Capsicum/Cucumber (greenhouse/polyhouse visible)

════════════════════════════════════════
STEP 5 — HEALTH & STRESS ASSESSMENT
════════════════════════════════════════
Identify zones of concern:
• Uniform deep green → Healthy, well-nourished
• Patchy yellowing → Nutrient deficiency / waterlogging
• Brown/dry patches → Drought stress / pest damage
• Dark waterlogged zones → Drainage issues
• Missing plant gaps → Crop failure / disease mortality
• Uneven canopy density → Mixed age planting / irregular inputs
• Edge browning → Boundary stress / wind damage

════════════════════════════════════════
REQUIRED OUTPUT FORMAT
════════════════════════════════════════

1. IDENTIFIED CROP (Primary)
   → Species name (common + scientific)
   → Confidence level: __%
   → Key reasons for identification (3–5 bullet points)

2. ALTERNATIVE POSSIBILITIES (ranked 2nd, 3rd)
   → Crop name + reason for consideration
   → Differentiating factor that separates from primary choice

3. PLANTATION METRICS
   → Estimated plant spacing: ___ × ___ meters
   → Estimated plant density: ___ plants/acre
   → Estimated crop age/stage: ___ months/years
   → Field area estimate: ___ acres (approx.)

4. GEOGRAPHIC REGION ESTIMATE
   → Most likely Indian state(s): ___
   → Agro-climatic zone: ___
   → Season (Kharif / Rabi / Zaid / Perennial): ___

5. HEALTH & VIGOR RATING
   → Overall rating: Excellent / Good / Fair / Poor
   → Stress zones identified: ___
   → Uniformity score: ___/10

6. FARMING SYSTEM
   → Classification: Monoculture / Intercropping / Agroforestry / Mixed Orchard / Commercial / Organic
   → Irrigation method (if visible): ___
   → Mechanization level: Low / Medium / High

7. RECOMMENDATIONS
   → Suggested ground-truth verification method
   → Remote sensing indices to apply (NDVI / EVI / SAVI / LAI)
   → Additional data layers to overlay (soil map, weather, etc.)

8. ANOMALIES & SPECIAL OBSERVATIONS
   → Any unusual patterns, structures, or features noted

Now please analyze the satellite/aerial image I have attached above.`;

const ANNOTATED_MAP_PROMPT = `You are a professional GIS cartographer and agricultural remote sensing analyst. I am providing a satellite or aerial image of a farm/plantation.

Your task is to generate a NEW annotated composite image in the style of a professional precision agriculture GIS analysis map — exactly like a QGIS or ArcGIS field report output.

════════════════════════════════════════
LAYER A — VEGETATION DENSITY COLOR OVERLAY
════════════════════════════════════════
Apply semi-transparent color masks (~45% opacity) over the original satellite image:

🟩 BRIGHT GREEN fill  → Dense Healthy vegetation (NDVI high, uniform closed canopy)
🟧 ORANGE/AMBER fill  → Moderate Density vegetation (NDVI medium, visible gaps)
🟨 YELLOW fill        → Sparse / Stressed vegetation (NDVI low, thinning or young plants)

Rules:
• Trace the actual canopy boundaries — do NOT apply rectangular uniform fills
• Follow the real shape of each vegetation zone as visible in the image
• Keep original satellite detail visible beneath overlays (semi-transparent only)
• Transition zones between density classes should be smooth/gradient where applicable

════════════════════════════════════════
LAYER B — CROP BLOCK BOUNDARY POLYGONS
════════════════════════════════════════
Draw clearly visible polygon outlines (2–3px thick) around each identified crop zone:

CYAN / TURQUOISE solid border   → Primary crop block (main plantation area)
                                   Label inside: "A: Main [Crop Name] Block"
                                   Large bold italic scientific name centered:
                                   e.g. "Musa spp. (Banana)"

MAGENTA / HOT PINK solid border → Secondary crop species block
                                   Label inside: "B: [Crop Name] Block"
                                   Large bold italic scientific name centered:
                                   e.g. "Cocos nucifera (Coconut)"

ORANGE solid border             → Mixed / arable / transitional zone
                                   Label: "Mixed Arable Field"

WHITE solid border              → Farm buildings, residences, infrastructure
                                   Label: "Farm Buildings / Residence"

Important: Polygon borders must follow the ACTUAL irregular field boundaries visible
in the image — NOT simple rectangles. Trace the real shape.

════════════════════════════════════════
LAYER C — STRESS ZONE MARKERS
════════════════════════════════════════
Draw DASHED RED/BROWN CIRCLES around every area showing:
• Sparse or thinning canopy at field edges
• Yellowing or browning patches
• Missing plant gaps or low density zones
• Transition stress between crop types

Label each circle with the appropriate stress type:
• "Sparse Density Zone"     → at corners or edges with thin planting
• "Edge-Stress Zone"        → along field boundaries showing boundary stress
• "Block A (Banana): Stress Zone" → within the main block sparse patches
• "Block A (Thinne): Patch" → visibly thinner density sub-zones

Style: Dashed circle outline, dark red/maroon color (#8B0000 or similar), no fill

════════════════════════════════════════
LAYER D — TEXT ANNOTATIONS (on-image labels)
════════════════════════════════════════
Place white bold text with dark drop-shadow directly on image:

LARGE LABELS (centered in each zone, font size ~18–22pt bold italic):
• Primary crop zone: "Musa spp. \n(Banana)" — white, bold italic, centered
• Secondary zone: "Cocos nucifera \n(Coconut)" — white, bold italic, centered

MEDIUM LABELS (font size ~11–13pt bold):
• "A: Main Banana Block" — bottom-left of primary zone
• "B: Coconut Block" — inside secondary zone
• "Mixed Arable Field" — inside orange zone
• "Farm Buildings / Residence" — inside white box(es)
• "Access Road" — along any visible road
• "Internal Tracks" — along internal farm tracks

SMALL LABELS (font size ~9–10pt, white with shadow):
• Each stress circle label (as described in Layer C)
• "Block A (Banana): Edge — Stress Zone" with arrow pointing to edge

════════════════════════════════════════
LAYER E — LEGEND PANEL (Bottom-Left Corner)
════════════════════════════════════════
Insert a dark semi-transparent panel (black ~80% opacity, rounded corners):

┌──────────────────────────────┐
│  Legend Box                  │
│  ─────────────────────────   │
│  Vegetation Density          │
│  ─────────────────────────   │
│  🟩  Dense Healthy           │
│  🟧  Moderate Density        │
│  🟨  Sparse / Stressed       │
└──────────────────────────────┘

Font: white, clean sans-serif, 10–11pt
Position: bottom-left corner, ~15px from edges

════════════════════════════════════════
LAYER F — CLASSIFICATION PANEL (Top-Right Corner)
════════════════════════════════════════
Insert a dark bordered info panel (black ~85% opacity background):

┌──────────────────────────────────────────┐
│  CROP CLASSIFICATION & ANALYSIS          │
│  [cite: Confidence %]                    │
│  ──────────────────────────────────────  │
│  1. [cite: Musa spp. (Banana)]:          │
│     ~95% confidence                      │
│     (Rosette crowns, lime green, grid)   │
│                                          │
│  2. [cite: Cocos nucifera (Coconut)]:    │
│     ~75% confidence                      │
│     (Star-burst crowns, dark green)      │
│                                          │
│  3. [cite: Mixed Plantation]:            │
│     ~60% confidence                      │
│     (Variable signatures)               │
│  ──────────────────────────────────────  │
│  POTENTIAL ANOMALIES:                    │
│  [cite: Stress Zone (red circles)]: ~20% │
│  (Sparse density, edge-stress)           │
│  ──────────────────────────────────────  │
│  [cite: Sensor: Multispectral composite] │
└──────────────────────────────────────────┘

Font: white monospace/sans-serif, 9pt
Width: ~260px, position: top-right, ~15px from edges
Border: 1px dashed white or light grey

════════════════════════════════════════
LAYER G — COMPASS & SCALE BAR (Bottom-Right Corner)
════════════════════════════════════════
• North arrow: simple white "N" with upward arrow indicator
• Scale bar: horizontal bar showing "0m ── 50m ── 100m"
  (white fill bar with black outline, labeled at 0, 50, 100)
• Position: bottom-right corner

════════════════════════════════════════
LAYER H — COORDINATE FOOTER (Bottom Center)
════════════════════════════════════════
Add a small white text footer bar at the very bottom:
"Coord: [Region / District], [State] / Date: [YYYY-MM-DD] / Scale: 1:2500"

════════════════════════════════════════
FINAL IMAGE SPECIFICATIONS
════════════════════════════════════════
• Base layer: the original satellite image (do NOT alter or distort it)
• Output: same resolution as input or higher
• Style: Professional GIS / Precision Agriculture field report
• All overlays semi-transparent (original image must remain visible underneath)
• Color scheme: dark panels with bright overlay colors (cyan, magenta, orange, green)
• Aesthetic: QGIS / ArcGIS multispectral crop analysis map output
• Do NOT add a plain background — the satellite image IS the background

Now generate the fully annotated GIS-style analysis map from the satellite image I have attached above.`;

const PROMPT_TEMPLATES = [
  {
    label: "🌾 Crop Analysis Prompt",
    description: "Full 5-step plantation analysis for ChatGPT / Gemini / Nova",
    prompt: CROP_ANALYSIS_PROMPT,
  },
  {
    label: "🗺️ Annotated Map Generator",
    description: "Generate a GIS-style annotated satellite map image",
    prompt: ANNOTATED_MAP_PROMPT,
  },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nova-chat`;

export default function NovaChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPreview, setShowPreview] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelDragConstraints = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const isMobile = useIsMobile();

  /* ── Auto-dismiss tooltip ── */
  useEffect(() => {
    const seen = sessionStorage.getItem("nova-seen");
    if (!seen) {
      setShowTooltip(true);
      const t = setTimeout(() => {
        setShowTooltip(false);
        sessionStorage.setItem("nova-seen", "1");
      }, 4000);
      return () => clearTimeout(t);
    }
  }, []);

  /* ── Scroll to bottom ── */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  /* ── Focus input when opening ── */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  /* ── Load template into textarea ── */
  const loadTemplate = (prompt: string) => {
    setInput(prompt);
    setShowPreview(null);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 96) + "px";
        inputRef.current.focus();
      }
    }, 50);
  };

  /* ── Copy template to clipboard ── */
  const copyTemplate = async (prompt: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {}
  };

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setInput("");

      const userMsg: Msg = { role: "user", content: trimmed, ts: Date.now() };
      const history = [...messages, userMsg];
      setMessages(history);
      setLoading(true);

      let assistantText = "";

      try {
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error || `Error ${resp.status}`);
        }

        if (!resp.body) throw new Error("No response stream");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const upsert = (chunk: string) => {
          assistantText += chunk;
          const snapshot = assistantText;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: snapshot } : m));
            }
            return [...prev, { role: "assistant", content: snapshot, ts: Date.now() }];
          });
        };

        let done = false;
        while (!done) {
          const { done: rDone, value } = await reader.read();
          if (rDone) break;
          buffer += decoder.decode(value, { stream: true });

          let nlIdx: number;
          while ((nlIdx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, nlIdx);
            buffer = buffer.slice(nlIdx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") {
              done = true;
              break;
            }
            try {
              const parsed = JSON.parse(json);
              const c = parsed.choices?.[0]?.delta?.content;
              if (c) upsert(c);
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      } catch (e: any) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ ${e.message || "Something went wrong. Please try again."}`,
            ts: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => setMessages([]);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const panelMotion = isMobile
    ? { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } }
    : {
        initial: { opacity: 0, y: 20, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 20, scale: 0.95 },
      };

  return (
    <>
      {/* Full-screen drag constraint boundary */}
      <div ref={panelDragConstraints} className="fixed inset-0 pointer-events-none z-[9997]" />
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && !open && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="fixed bottom-[92px] right-7 z-[9998] bg-background/90 backdrop-blur-md border border-primary/20 rounded-xl px-4 py-2 text-sm text-foreground shadow-lg"
          >
            Ask Nova ✨
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB — draggable */}
      <motion.button
        drag
        dragMomentum={false}
        dragElastic={0.15}
        dragConstraints={{
          top: -(window.innerHeight - 80),
          left: -(window.innerWidth - 80),
          right: 0,
          bottom: 0,
        }}
        onClick={() => {
          setOpen((v) => !v);
          setShowTooltip(false);
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-7 right-7 z-[9999] w-14 h-14 rounded-full flex items-center justify-center shadow-xl focus:outline-none touch-none cursor-grab active:cursor-grabbing"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-violet, 271 81% 56%)))",
        }}
        aria-label="Toggle Nova AI chat — drag to reposition"
      >
        {!open && (
          <span
            className="absolute inset-0 rounded-full nova-pulse-ring"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-violet, 271 81% 56%)))",
            }}
          />
        )}
        {!open && (
          <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-background nova-online-dot" />
        )}
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.25 }}>
          {open ? <X className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-white" />}
        </motion.span>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            {...panelMotion}
            drag={!isMobile}
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={panelDragConstraints}
            dragControls={dragControls}
            dragListener={false}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={
              isMobile ? "fixed inset-0 z-[9998] flex flex-col" : "fixed bottom-24 right-7 z-[9998] flex flex-col"
            }
            style={
              isMobile
                ? { background: "rgba(11,15,26,0.96)", backdropFilter: "blur(20px)" }
                : {
                    width: 380,
                    height: 600,
                    background: "rgba(11,15,26,0.92)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(0,229,255,0.15)",
                    borderRadius: 20,
                    boxShadow: "0 8px 40px rgba(0,229,255,0.08), 0 2px 8px rgba(0,0,0,0.6)",
                  }
            }
          >
            {/* Header — drag handle on desktop */}
            <div
              onPointerDown={(e) => {
                if (!isMobile) dragControls.start(e);
              }}
              className={`flex items-center gap-3 px-4 pt-4 pb-3 border-b border-primary/10 ${!isMobile ? "cursor-grab active:cursor-grabbing select-none" : ""}`}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-violet, 271 81% 56%)))",
                }}
              >
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">Nova</p>
                <p className="text-xs text-muted-foreground">TerraLens AI • Satellite Intelligence</p>
              </div>
              <button
                onClick={clearChat}
                className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                title="Minimize"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto nova-scrollbar px-4 py-3 space-y-3">
              {messages.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                  {/* Avatar */}
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-violet, 271 81% 56%)))",
                    }}
                  >
                    <Bot className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-foreground font-semibold text-sm">Hey! I'm Nova ✨</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                      Ask me about satellite imagery, AI enhancement, land analysis, or anything TerraLens.
                    </p>
                  </div>

                  {/* Quick starters */}
                  <div className="flex flex-wrap justify-center gap-2 mt-1">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="text-xs px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="w-full flex items-center gap-2 px-1 mt-1">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                      Prompt Templates
                    </span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  {/* Template cards */}
                  {PROMPT_TEMPLATES.map((tpl, idx) => {
                    const isCropCard = idx === 0;
                    const isOpen = showPreview === idx;
                    const a = isCropCard
                      ? {
                          border: "border-emerald-500/25",
                          bg: "bg-emerald-500/5",
                          div: "border-emerald-500/10",
                          iconBg: "rgba(16,185,129,0.15)",
                          icon: <Leaf className="w-3.5 h-3.5 text-emerald-400" />,
                          label: "text-emerald-300",
                          btn: "text-emerald-300 hover:text-white hover:bg-emerald-500/10",
                        }
                      : {
                          border: "border-sky-500/25",
                          bg: "bg-sky-500/5",
                          div: "border-sky-500/10",
                          iconBg: "rgba(14,165,233,0.15)",
                          icon: <MapPin className="w-3.5 h-3.5 text-sky-400" />,
                          label: "text-sky-300",
                          btn: "text-sky-300 hover:text-white hover:bg-sky-500/10",
                        };
                    return (
                      <div key={idx} className={`w-full rounded-xl border ${a.border} ${a.bg} overflow-hidden`}>
                        {/* Header */}
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: a.iconBg }}
                          >
                            {a.icon}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className={`text-xs font-semibold ${a.label} leading-tight`}>{tpl.label}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{tpl.description}</p>
                          </div>
                          <button
                            onClick={() => copyTemplate(tpl.prompt, idx)}
                            className={`p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors shrink-0`}
                            title={copiedIdx === idx ? "Copied!" : "Copy to clipboard"}
                          >
                            {copiedIdx === idx ? (
                              <ClipboardCheck className={`w-3.5 h-3.5 ${a.label}`} />
                            ) : (
                              <Clipboard className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Preview toggle */}
                        <button
                          onClick={() => setShowPreview(isOpen ? null : idx)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground border-t ${a.div} hover:bg-white/[0.03] transition-colors`}
                        >
                          <span>{isOpen ? "Hide preview" : "Preview prompt"}</span>
                          {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {/* Collapsible preview */}
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className={`px-3 pb-2 max-h-28 overflow-y-auto nova-scrollbar border-t ${a.div}`}>
                                <pre className="text-[9px] text-muted-foreground/70 whitespace-pre-wrap font-mono leading-relaxed mt-2">
                                  {tpl.prompt.slice(0, 500)}…
                                </pre>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Load CTA */}
                        <button
                          onClick={() => loadTemplate(tpl.prompt)}
                          className={`w-full px-3 py-2 text-xs font-semibold border-t ${a.div} ${a.btn} transition-colors flex items-center justify-center gap-1.5`}
                        >
                          <span>Load into chat</span>
                          <span>→</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className="flex gap-2 max-w-[85%]">
                        {m.role === "assistant" && (
                          <span
                            className="w-5 h-5 rounded-full shrink-0 mt-1 flex items-center justify-center"
                            style={{
                              background:
                                "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-violet, 271 81% 56%)))",
                            }}
                          >
                            <Bot className="w-3 h-3 text-white" />
                          </span>
                        )}
                        <div>
                          <div
                            className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                              m.role === "user"
                                ? "bg-primary/12 border border-primary/20 text-foreground"
                                : "bg-white/[0.04] text-foreground nova-markdown"
                            }`}
                          >
                            {m.role === "assistant" ? (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  code({ className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || "");
                                    const codeStr = String(children).replace(/\n$/, "");
                                    if (match) {
                                      return (
                                        <SyntaxHighlighter
                                          style={oneDark}
                                          language={match[1]}
                                          PreTag="div"
                                          customStyle={{ borderRadius: 8, fontSize: "0.82em", margin: "6px 0" }}
                                        >
                                          {codeStr}
                                        </SyntaxHighlighter>
                                      );
                                    }
                                    return (
                                      <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs" {...props}>
                                        {children}
                                      </code>
                                    );
                                  },
                                }}
                              >
                                {m.content}
                              </ReactMarkdown>
                            ) : (
                              m.content
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 px-1">{formatTime(m.ts)}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {loading && !messages.some((m) => m.role === "assistant" && m === messages[messages.length - 1]) && (
                    <div className="flex gap-2 items-center">
                      <span
                        className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                        style={{
                          background:
                            "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-violet, 271 81% 56%)))",
                        }}
                      >
                        <Bot className="w-3 h-3 text-white" />
                      </span>
                      <div className="flex gap-1.5 px-3 py-3">
                        <span className="w-2 h-2 rounded-full bg-primary/60 nova-dot-1" />
                        <span className="w-2 h-2 rounded-full bg-primary/60 nova-dot-2" />
                        <span className="w-2 h-2 rounded-full bg-primary/60 nova-dot-3" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Input */}
            <div className="px-4 pt-2 pb-3 border-t border-primary/10">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Nova about TerraLens..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors max-h-24"
                  style={{ minHeight: 40 }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = Math.min(el.scrollHeight, 96) + "px";
                  }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-30 transition-opacity"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-violet, 271 81% 56%)))",
                  }}
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
              {input.length > 800 && <p className="text-[10px] text-amber-400 mt-1 px-1">{input.length}/800+ chars</p>}
              <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
                Nova may make mistakes. Verify important info.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
