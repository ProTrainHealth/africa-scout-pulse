import { useState, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { Building2, ShieldAlert, Zap } from "lucide-react";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const AFRICA_ISO_CODES = [
  "DZA","AGO","BEN","BWA","BFA","BDI","CPV","CMR","CAF","TCD",
  "COM","COG","COD","CIV","DJI","EGY","GNQ","ERI","SWZ","ETH",
  "GAB","GMB","GHA","GIN","GNB","KEN","LSO","LBR","LBY","MDG",
  "MWI","MLI","MRT","MUS","MAR","MOZ","NAM","NER","NGA","RWA",
  "STP","SEN","SLE","SOM","ZAF","SSD","SDN","TZA","TGO","TUN",
  "UGA","ZMB","ZWE",
];

// ISO 3166-1 numeric → ISO alpha-3 mapping for African countries
// world-atlas TopoJSON exposes numeric codes via `id`
const NUMERIC_TO_ISO3: Record<string, string> = {
  "012":"DZA","024":"AGO","204":"BEN","072":"BWA","854":"BFA","108":"BDI",
  "132":"CPV","120":"CMR","140":"CAF","148":"TCD","174":"COM","178":"COG",
  "180":"COD","384":"CIV","262":"DJI","818":"EGY","226":"GNQ","232":"ERI",
  "748":"SWZ","231":"ETH","266":"GAB","270":"GMB","288":"GHA","324":"GIN",
  "624":"GNB","404":"KEN","426":"LSO","430":"LBR","434":"LBY","450":"MDG",
  "454":"MWI","466":"MLI","478":"MRT","480":"MUS","504":"MAR","508":"MOZ",
  "516":"NAM","562":"NER","566":"NGA","646":"RWA","678":"STP","686":"SEN",
  "694":"SLE","706":"SOM","710":"ZAF","728":"SSD","729":"SDN","834":"TZA",
  "768":"TGO","788":"TUN","800":"UGA","894":"ZMB","716":"ZWE",
};

type Signal = "ACCUMULATE" | "HOLD" | "MONITOR";

interface CompanyMarker {
  name: string;
  country: string;
  coordinates: [number, number];
  score: number;
  signal: Signal;
}

const TRACKED_MARKERS: CompanyMarker[] = [
  { name: "Dangote Cement", country: "NGA", coordinates: [7.4, 9.0], score: 84, signal: "ACCUMULATE" },
  { name: "Safaricom", country: "KEN", coordinates: [36.8, -1.3], score: 79, signal: "ACCUMULATE" },
  { name: "MTN Group", country: "ZAF", coordinates: [28.0, -26.2], score: 72, signal: "ACCUMULATE" },
  { name: "Transnet", country: "ZAF", coordinates: [18.4, -33.9], score: 51, signal: "MONITOR" },
  { name: "ESKOM", country: "ZAF", coordinates: [25.7, -29.1], score: 45, signal: "MONITOR" },
  { name: "Société Générale Maroc", country: "MAR", coordinates: [-7.6, 33.6], score: 68, signal: "HOLD" },
  { name: "KenGen", country: "KEN", coordinates: [37.1, -0.4], score: 73, signal: "ACCUMULATE" },
  { name: "SONATEL", country: "SEN", coordinates: [-17.4, 14.7], score: 66, signal: "HOLD" },
  { name: "NMDC", country: "NGA", coordinates: [8.9, 9.9], score: 58, signal: "HOLD" },
  { name: "BUA Foods", country: "NGA", coordinates: [3.4, 6.5], score: 71, signal: "ACCUMULATE" },
];

const SANCTIONS_MARKERS = [
  { name: "Sudan — Active Sanctions", coordinates: [30.2, 15.5] as [number, number], type: "sanctions" },
  { name: "Ethiopia — Tigray Watch", coordinates: [39.5, 11.6] as [number, number], type: "sanctions" },
  { name: "DRC — Eastern Zone Alert", coordinates: [29.2, -2.9] as [number, number], type: "sanctions" },
];

const CATALYST_MARKERS = [
  { name: "East African Pipeline (EACOP)", coordinates: [32.0, 1.3] as [number, number], type: "catalyst" },
  { name: "Dangote Refinery — Phase 2", coordinates: [3.3, 6.6] as [number, number], type: "catalyst" },
  { name: "Cairo Metro Expansion", coordinates: [31.2, 30.1] as [number, number], type: "catalyst" },
];

const SIGNAL_COLOR: Record<Signal, string> = {
  ACCUMULATE: "hsl(155 55% 42%)",
  HOLD: "hsl(38 100% 50%)",
  MONITOR: "hsl(0 72% 51%)",
};

interface NativeWorldMapProps {
  height?: number;
  showControls?: boolean;
  className?: string;
  onCountryClick?: (iso3: string) => void;
}

interface HoveredMarker {
  name: string;
  score: number;
  signal: Signal;
  x: number;
  y: number;
}

const NativeWorldMap = ({
  height = 480,
  showControls = true,
  className = "",
  onCountryClick,
}: NativeWorldMapProps) => {
  const [layers, setLayers] = useState({
    companies: true,
    sanctions: true,
    catalysts: true,
  });
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<HoveredMarker | null>(null);

  const africaSet = useMemo(() => new Set(AFRICA_ISO_CODES), []);

  const toggleLayer = (key: keyof typeof layers) =>
    setLayers((s) => ({ ...s, [key]: !s[key] }));

  const handleMarkerEnter = (
    e: React.MouseEvent<SVGGElement>,
    m: CompanyMarker,
  ) => {
    const rect = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement)?.getBoundingClientRect();
    setHoveredMarker({
      name: m.name,
      score: m.score,
      signal: m.signal,
      x: e.clientX - (rect?.left ?? 0) + 12,
      y: e.clientY - (rect?.top ?? 0) + 12,
    });
  };

  return (
    <div className={`relative ${className}`}>
      {showControls && (
        <div className="mb-3 flex flex-wrap gap-2">
          {([
            { key: "companies", label: "Companies", Icon: Building2 },
            { key: "sanctions", label: "Sanctions", Icon: ShieldAlert },
            { key: "catalysts", label: "Catalysts", Icon: Zap },
          ] as const).map(({ key, label, Icon }) => {
            const active = layers[key];
            return (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "bg-secondary/50 border-border/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div
        className="relative w-full overflow-hidden rounded-xl border border-border/40 bg-card"
        style={{ height }}
      >
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: [20, 0], scale: 200 }}
          width={800}
          height={height}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup center={[20, 0]} zoom={1} minZoom={0.8} maxZoom={6}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const numericId = String(geo.id).padStart(3, "0");
                  const iso3 = NUMERIC_TO_ISO3[numericId];
                  const isAfrica = iso3 ? africaSet.has(iso3) : false;
                  const isSelected = iso3 && iso3 === selectedCountry;

                  const baseFill = isSelected
                    ? "hsl(38 100% 50% / 0.2)"
                    : isAfrica
                      ? "hsl(220 15% 14%)"
                      : "hsl(220 15% 8%)";

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => {
                        if (isAfrica && iso3) {
                          setSelectedCountry(iso3);
                          onCountryClick?.(iso3);
                        }
                      }}
                      style={{
                        default: {
                          fill: baseFill,
                          stroke: isAfrica
                            ? "hsl(38 100% 50% / 0.3)"
                            : "hsl(220 12% 16%)",
                          strokeWidth: isAfrica ? 0.5 : 0.3,
                          outline: "none",
                          cursor: isAfrica ? "pointer" : "default",
                        },
                        hover: {
                          fill: isAfrica
                            ? "hsl(38 100% 50% / 0.15)"
                            : baseFill,
                          stroke: isAfrica
                            ? "hsl(38 100% 50% / 0.5)"
                            : "hsl(220 12% 16%)",
                          strokeWidth: isAfrica ? 0.7 : 0.3,
                          outline: "none",
                        },
                        pressed: {
                          fill: isAfrica
                            ? "hsl(38 100% 50% / 0.25)"
                            : baseFill,
                          outline: "none",
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {layers.companies &&
              TRACKED_MARKERS.map((m) => {
                const color = SIGNAL_COLOR[m.signal];
                return (
                  <Marker
                    key={m.name}
                    coordinates={m.coordinates}
                    onMouseEnter={(e) => handleMarkerEnter(e as any, m)}
                    onMouseLeave={() => setHoveredMarker(null)}
                    style={{
                      default: { cursor: "pointer" },
                      hover: { cursor: "pointer" },
                      pressed: { cursor: "pointer" },
                    }}
                  >
                    <circle
                      r={8}
                      fill={color}
                      opacity={0.3}
                      className="animate-pulse-slow"
                    />
                    <circle r={5} fill={color} stroke="hsl(220 15% 6%)" strokeWidth={1} />
                    <title>{`${m.name} — Score ${m.score}`}</title>
                  </Marker>
                );
              })}

            {layers.sanctions &&
              SANCTIONS_MARKERS.map((m) => (
                <Marker key={m.name} coordinates={m.coordinates}>
                  <g transform="rotate(45)">
                    <rect
                      x={-4}
                      y={-4}
                      width={8}
                      height={8}
                      fill="hsl(0 72% 51% / 0.8)"
                      stroke="hsl(0 72% 51%)"
                      strokeWidth={1}
                    />
                  </g>
                  <title>{m.name}</title>
                </Marker>
              ))}

            {layers.catalysts &&
              CATALYST_MARKERS.map((m) => (
                <Marker key={m.name} coordinates={m.coordinates}>
                  <circle
                    r={6}
                    fill="transparent"
                    stroke="hsl(38 100% 50%)"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                  />
                  <circle r={2} fill="hsl(38 100% 50%)" />
                  <title>{m.name}</title>
                </Marker>
              ))}
          </ZoomableGroup>
        </ComposableMap>

        {hoveredMarker && (
          <div
            className="glass-card pointer-events-none absolute z-10 min-w-[180px] rounded-lg p-3"
            style={{ left: hoveredMarker.x, top: hoveredMarker.y }}
          >
            <div className="font-bold text-sm">{hoveredMarker.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Scout Score: {hoveredMarker.score}
            </div>
            <span
              className="mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-mono font-bold"
              style={{
                backgroundColor: `${SIGNAL_COLOR[hoveredMarker.signal]}33`,
                color: SIGNAL_COLOR[hoveredMarker.signal],
              }}
            >
              {hoveredMarker.signal}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NativeWorldMap;
export type { NativeWorldMapProps };
