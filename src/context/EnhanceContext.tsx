import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { EnhanceResponse } from "@/services/api";

type ProcessingStatus = "idle" | "uploading" | "processing" | "complete" | "error";

export type QualityMode = "fast" | "max";

export interface MapLocation {
  lat: number;
  lng: number;
  label?: string;
}

export interface GroundTruthMetrics {
  psnr: number;
  ssim: number;
  compute_time: number;
}

export interface EnhanceResult {
  srImageUrl: string;
  originalImage: string;
  metrics: { psnr: number; ssim: number; processing_time: number };
  originalDimensions: [number, number];
  enhancedDimensions: [number, number];
  fileName: string;
  fileSize: number;
  model: string;
  scaleFactor: string;
  timestamp: string;
  analysis?: string;
  location?: MapLocation | null;
  /** If this was a benchmark image, its ID */
  benchmarkImageId?: string | null;
  /** Ground-truth high-res URL for benchmark comparison */
  groundTruthUrl?: string | null;
  /** Server-computed ground-truth metrics (vs high-res original) */
  groundTruthMetrics?: GroundTruthMetrics | null;
  /** True when Gemini fell back to analysis-only (no image enhancement) */
  geminiFallback?: boolean;
}

interface EnhanceState {
  file: File | null;
  preview: string | null;
  scaleFactor: string;
  model: string;
  qualityMode: QualityMode;
  status: ProcessingStatus;
  error: string | null;
  result: EnhanceResult | null;
  location: MapLocation | null;
}

interface EnhanceContextValue extends EnhanceState {
  setFile: (file: File | null, preview: string | null) => void;
  setScaleFactor: (v: string) => void;
  setModel: (v: string) => void;
  setQualityMode: (v: QualityMode) => void;
  setStatus: (s: ProcessingStatus) => void;
  setError: (e: string | null) => void;
  setResult: (r: EnhanceResult | null) => void;
  location: MapLocation | null;
  setLocation: (loc: MapLocation | null) => void;
  reset: () => void;
}

const SESSION_KEY = "supersat_last_result";

function loadPersistedResult(): EnhanceResult | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const EnhanceContext = createContext<EnhanceContextValue | null>(null);

export function EnhanceProvider({ children }: { children: ReactNode }) {
  const [file, setFileState] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scaleFactor, setScaleFactor] = useState("4");
  const [model, setModel] = useState("kie");
  const [qualityMode, setQualityMode] = useState<QualityMode>("fast");
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResultState] = useState<EnhanceResult | null>(loadPersistedResult);
  const [location, setLocation] = useState<MapLocation | null>(null);

  const setFile = useCallback((f: File | null, p: string | null) => {
    setFileState(f);
    setPreview(p);
  }, []);

  const setResult = useCallback((r: EnhanceResult | null) => {
    setResultState(r);
    if (r) {
      try {
        const { srImageUrl, originalImage, ...metadata } = r;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(metadata));
      } catch {
        // Quota exceeded
      }
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const reset = useCallback(() => {
    setFileState(null);
    setPreview(null);
    setStatus("idle");
    setError(null);
  }, []);

  return (
    <EnhanceContext.Provider
      value={{
        file, preview, scaleFactor, model, qualityMode, status, error, result, location,
        setFile, setScaleFactor, setModel, setQualityMode, setStatus, setError, setResult, setLocation, reset,
      }}
    >
      {children}
    </EnhanceContext.Provider>
  );
}

export function useEnhance() {
  const ctx = useContext(EnhanceContext);
  if (!ctx) throw new Error("useEnhance must be used within EnhanceProvider");
  return ctx;
}
