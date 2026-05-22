import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Layers, MapPin, ImageOff } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

type LayerKey = "satellite" | "street" | "terrain" | "topo";

const TILE_LAYERS: Record<LayerKey, { url: string; attribution: string; label: string }> = {
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    label: "Satellite",
  },
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    label: "Street",
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; OpenTopoMap contributors',
    label: "Terrain",
  },
  topo: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; Esri &mdash; Sources: Esri, HERE, Garmin',
    label: "Topo",
  },
};

const LAYER_KEYS: LayerKey[] = ["satellite", "street", "terrain", "topo"];

type Enhancement = Tables<"enhancement_history">;

const MapGallery = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Enhancement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLayer, setActiveLayer] = useState<LayerKey>("satellite");
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchEntries = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("enhancement_history")
        .select("*")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("created_at", { ascending: false });
      setEntries(data ?? []);
      setLoading(false);
    };
    fetchEntries();
  }, [user]);

  // Fit bounds to markers
  useEffect(() => {
    if (!mapRef.current || entries.length === 0) return;
    const bounds = L.latLngBounds(
      entries.map((e) => [e.latitude!, e.longitude!] as [number, number])
    );
    mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [entries]);

  const layer = TILE_LAYERS[activeLayer];

  if (authLoading || (!user && !authLoading)) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 pt-16 relative">
        {loading ? (
          <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <MapPin className="w-8 h-8 animate-pulse text-primary" />
              <span className="text-sm">Loading geotagged images…</span>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
            <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                <ImageOff className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">No geotagged images yet</h2>
              <p className="text-sm text-muted-foreground">
                Enhance images with a location pinned on the map to see them plotted here.
              </p>
              <Button onClick={() => navigate("/enhance")} className="rounded-xl">
                Go to Enhance
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-4rem)] relative">
            <MapContainer
              center={[20, 0]}
              zoom={2}
              className="h-full w-full"
              ref={mapRef}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer key={activeLayer} attribution={layer.attribution} url={layer.url} />
              {entries.map((entry) => (
                <Marker key={entry.id} position={[entry.latitude!, entry.longitude!]}>
                  <Popup minWidth={220} maxWidth={280}>
                    <div className="flex flex-col gap-2 p-1">
                      {entry.sr_image_url && (
                        <img
                          src={entry.sr_image_url}
                          alt={entry.file_name}
                          className="w-full h-32 object-cover rounded-lg"
                          loading="lazy"
                        />
                      )}
                      <div className="space-y-1">
                        <p className="font-semibold text-sm truncate">{entry.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.model} · {new Date(entry.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground/70 font-mono">
                          {entry.latitude!.toFixed(4)}, {entry.longitude!.toFixed(4)}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          navigate("/results", {
                            state: { historyId: entry.id },
                          })
                        }
                        className="w-full text-center text-xs font-medium py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        View Results
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Layer Switcher */}
            <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1 bg-background/80 backdrop-blur-md rounded-xl border border-border/60 p-1 shadow-lg">
              <Layers className="w-3.5 h-3.5 text-muted-foreground ml-1.5 mr-0.5" />
              {LAYER_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveLayer(key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                    activeLayer === key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {TILE_LAYERS[key].label}
                </button>
              ))}
            </div>

            {/* Entry count badge */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-background/80 backdrop-blur-md rounded-xl border border-border/60 px-3 py-1.5 shadow-lg">
              <span className="text-xs font-medium text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 inline mr-1 text-primary" />
                {entries.length} geotagged image{entries.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapGallery;
