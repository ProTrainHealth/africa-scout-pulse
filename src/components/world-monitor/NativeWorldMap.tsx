import { useEffect, useState, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { Building2, ShieldAlert, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

interface TrackedMarker {
  name: string;
  country: string;
  coordinates: [number, number];
  score: number;
  signal: Signal;
}

interface SanctionsMarker {
  name: string;
  coordinates: [number, number];
  type: "sanctions";
}

interface CatalystMarker {
  name: string;
  coordinates: [number, number];
  type: "catalyst";
  company_id?: string;
}

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
  selectedCountryCode?: string | null;
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
  selectedCountryCode = null,
}: NativeWorldMapProps) => {
  const [layers, setLayers] = useState({
    companies: true,
    sanctions: true,
    catalysts: true,
  });
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<HoveredMarker | null>(null);

  const [trackedMarkers, setTrackedMarkers] = useState<TrackedMarker[]>([]);
  const [sanctionsMarkers, setSanctionsMarkers] = useState<SanctionsMarker[]>([]);
  const [catalystMarkers, setCatalystMarkers] = useState<CatalystMarker[]>([]);
  const [mapDataLoading, setMapDataLoading] = useState(true);

  const africaSet = useMemo(() => new Set(AFRICA_ISO_CODES), []);

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      const [companiesRes, contextRes, catalystsRes] = await Promise.all([
        supabase
          .from("companies")
          .select("name, country_code, scout_score, latitude, longitude")
          .not("latitude", "is", null)
          .not("longitude", "is", null),
        supabase
          .from("country_context")
          .select("country, country_code, risk_tag, latitude, longitude")
          .or(
            "risk_tag.ilike.%sanction%,risk_tag.ilike.%alert%,risk_tag.ilike.%restricted%,risk_tag.ilike.%elevated%",
          ),
        supabase
          .from("catalysts")
          .select(
            "id, title, type, company_id, companies:company_id ( name, latitude, longitude )",
          )
          .limit(20),
      ]);

      if (cancelled) return;

      if (!companiesRes.error && companiesRes.data) {
        const mapped: TrackedMarker[] = companiesRes.data
          .filter((c: any) => c.latitude != null && c.longitude != null)
          .map((c: any) => {
            const score = c.scout_score ?? 0;
            const signal: Signal =
              score >= 70 ? "ACCUMULATE" : score >= 55 ? "HOLD" : "MONITOR";
            return {
              name: c.name,
              country: c.country_code ?? "",
              coordinates: [Number(c.longitude), Number(c.latitude)],
              score,
              signal,
            };
          });
        setTrackedMarkers(mapped);
      } else if (companiesRes.error) {
        console.error("companies fetch:", companiesRes.error);
      }

      if (!contextRes.error && contextRes.data) {
        const mapped: SanctionsMarker[] = contextRes.data
          .filter((c: any) => c.latitude != null && c.longitude != null)
          .map((c: any) => ({
            name: `${c.country} — ${c.risk_tag}`,
            coordinates: [Number(c.longitude), Number(c.latitude)],
            type: "sanctions" as const,
          }));
        setSanctionsMarkers(mapped);
      } else if (contextRes.error) {
        console.error("country_context fetch:", contextRes.error);
      }

      if (!catalystsRes.error && catalystsRes.data) {
        const mapped: CatalystMarker[] = (catalystsRes.data as any[])
          .filter((c) => c.companies?.latitude != null && c.companies?.longitude != null)
          .map((c) => ({
            name: `${c.companies.name} — ${c.title ?? c.type ?? "Catalyst"}`,
            coordinates: [
              Number(c.companies.longitude),
              Number(c.companies.latitude),
            ],
            type: "catalyst" as const,
            company_id: c.id,
          }));
        setCatalystMarkers(mapped);
      } else if (catalystsRes.error) {
        console.error("catalysts fetch:", catalystsRes.error);
      }

      setMapDataLoading(false);
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleLayer = (key: keyof typeof layers) =>
    setLayers((s) => ({ ...s, [key]: !s[key] }));

  const handleMarkerEnter = (
    e: React.MouseEvent<SVGGElement>,
    m: TrackedMarker,
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
              trackedMarkers.map((m) => {
                const color = SIGNAL_COLOR[m.signal];
                const dim =
                  selectedCountryCode != null &&
                  m.country.toUpperCase() !== selectedCountryCode.toUpperCase();
                return (
                  <Marker
                    key={m.name}
                    coordinates={m.coordinates}
                    onMouseEnter={(e) => handleMarkerEnter(e as any, m)}
                    onMouseLeave={() => setHoveredMarker(null)}
                    style={{
                      default: { cursor: "pointer", opacity: dim ? 0.25 : 1 },
                      hover: { cursor: "pointer", opacity: dim ? 0.5 : 1 },
                      pressed: { cursor: "pointer", opacity: 1 },
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
              sanctionsMarkers.map((m) => (
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
              catalystMarkers.map((m) => (
                <Marker key={`${m.company_id}-${m.name}`} coordinates={m.coordinates}>
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

        {mapDataLoading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-card/40 animate-pulse">
            <span className="text-xs font-mono text-primary">
              Loading intelligence data...
            </span>
          </div>
        )}

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
