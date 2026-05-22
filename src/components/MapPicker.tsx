import { useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Search, X, Layers, LocateFixed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export interface MapLocation {
  lat: number;
  lng: number;
  label?: string;
}

interface MapPickerProps {
  value: MapLocation | null;
  onChange: (loc: MapLocation | null) => void;
  disabled?: boolean;
}

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

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const MapPicker = ({ value, onChange, disabled }: MapPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [activeLayer, setActiveLayer] = useState<LayerKey>("satellite");
  const mapRef = useRef<L.Map | null>(null);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (disabled) return;
      onChange({ lat, lng });
    },
    [onChange, disabled]
  );

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const loc: MapLocation = { lat: parseFloat(lat), lng: parseFloat(lon), label: display_name };
        onChange(loc);
        mapRef.current?.setView([loc.lat, loc.lng], 12);
      }
    } catch {
      // silently fail
    } finally {
      setSearching(false);
    }
  }, [searchQuery, onChange]);

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation || disabled) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: MapLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: "My location" };
        onChange(loc);
        mapRef.current?.setView([loc.lat, loc.lng], 14);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onChange, disabled]);

  const layer = TILE_LAYERS[activeLayer];

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search location…"
            className="pl-9 rounded-xl bg-muted/50 border-border text-sm"
            disabled={disabled}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSearch}
          disabled={disabled || searching}
          className="rounded-xl"
        >
          {searching ? "…" : "Search"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGeolocate}
          disabled={disabled || locating}
          className="rounded-xl"
          title="Use my current location"
        >
          <LocateFixed className={`w-4 h-4 ${locating ? "animate-pulse" : ""}`} />
        </Button>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="rounded-xl text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-border/50 h-[400px]">
        <MapContainer
          center={value ? [value.lat, value.lng] : [20, 0]}
          zoom={value ? 10 : 2}
          className="h-full w-full"
          ref={mapRef}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            key={activeLayer}
            attribution={layer.attribution}
            url={layer.url}
          />
          <ClickHandler onClick={handleMapClick} />
          {value && <Marker position={[value.lat, value.lng]} />}
        </MapContainer>

        {/* Layer Switcher - floating top-right */}
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
      </div>

      {/* Selected location label */}
      {value && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono">
            {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
          </span>
          {value.label && (
            <span className="truncate ml-1 text-foreground/70">— {value.label}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default MapPicker;
