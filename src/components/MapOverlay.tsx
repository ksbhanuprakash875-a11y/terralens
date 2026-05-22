import { useState } from "react";
import { MapContainer, TileLayer, Marker, ImageOverlay } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Eye, EyeOff } from "lucide-react";
import { Slider } from "@/components/ui/slider";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapOverlayProps {
  lat: number;
  lng: number;
  imageUrl: string;
  label?: string;
}

const MapOverlay = ({ lat, lng, imageUrl, label }: MapOverlayProps) => {
  const [showOverlay, setShowOverlay] = useState(true);
  const [opacity, setOpacity] = useState(0.6);

  // Create a bounding box around the point (~0.01 degrees ≈ ~1km)
  const delta = 0.005;
  const bounds: L.LatLngBoundsExpression = [
    [lat - delta, lng - delta],
    [lat + delta, lng + delta],
  ];

  return (
    <div className="glass rounded-2xl p-4 md:p-5 mt-6 md:mt-8 border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Location on Map</h3>
          {label && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">— {label}</span>
          )}
        </div>
        <button
          onClick={() => setShowOverlay(!showOverlay)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showOverlay ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showOverlay ? "Hide Overlay" : "Show Overlay"}
        </button>
      </div>

      <div className="rounded-xl overflow-hidden border border-border/50 h-[300px] md:h-[400px]">
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          className="h-full w-full"
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]} />
          {showOverlay && (
            <ImageOverlay url={imageUrl} bounds={bounds} opacity={opacity} />
          )}
        </MapContainer>
      </div>

      {showOverlay && (
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Overlay Opacity</span>
          <Slider
            value={[opacity * 100]}
            onValueChange={([v]) => setOpacity(v / 100)}
            min={10}
            max={100}
            step={5}
            className="flex-1"
          />
          <span className="text-xs font-mono text-muted-foreground w-10 text-right">{Math.round(opacity * 100)}%</span>
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <MapPin className="w-3 h-3" />
        <span className="font-mono">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
      </div>
    </div>
  );
};

export default MapOverlay;
