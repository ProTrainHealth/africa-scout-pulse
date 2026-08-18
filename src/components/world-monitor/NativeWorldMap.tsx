import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath, geoCentroid } from "d3-geo";
import { feature } from "topojson-client";
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
}

interface CatalystMarker {
  name: string;
  coordinates: [number, number];
  company_id?: string;
}

const SIGNAL_COLOR: Record<Signal, string> = {
  ACCUMULATE: "hsl(155 55% 42%)",
  HOLD: "hsl(38 100% 50%)",
  MONITOR: "hsl(0 72% 51%)",
};

const VIEW_W = 800;

const ISO3_TO_ISO2: Record<string, string> = {
  ZAF:"ZA",NGA:"NG",KEN:"KE",EGY:"EG",MAR:"MA",GHA:"GH",ETH:"ET",TZA:"TZ",
  RWA:"RW",CIV:"CI",ZMB:"ZM",AGO:"AO",MOZ:"MZ",SEN:"SN",BWA:"BW",DZA:"DZ",
  TUN:"TN",LBY:"LY",SDN:"SD",UGA:"UG",CMR:"CM",COD:"CD",COG:"CG",NAM:"NA",
  ZWE:"ZW",MWI:"MW",MDG:"MG",MUS:"MU",BEN:"BJ",BFA:"BF",MLI:"ML",NER:"NE",
  GIN:"GN",SLE:"SL",LBR:"LR",TGO:"TG",GMB:"GM",GAB:"GA",GNQ:"GQ",CAF:"CF",
  TCD:"TD",SOM:"SO",SSD:"SS",ERI:"ER",DJI:"DJ",BDI:"BI",LSO:"LS",SWZ:"SZ",
  MRT:"MR",GNB:"GW",CPV:"CV",COM:"KM",STP:"ST",
};

interface CountryInfo {
  country: string;
  flag_emoji: string;
  regime_status: string;
  risk_tag: string;
  heat: number;
}

interface NativeWorldMapProps {
  height?: number;
  showControls?: boolean;
  className?: string;
  onCountryClick?: (iso3: string) => void;
  selectedCountryCode?: string | null;
  /** ISO3 code to smoothly center the projection on */
  focusCountry?: string | null;
}

interface HoveredMarker {
  name: string;
  score: number;
  signal: Signal;
  x: number;
  y: number;
}

interface HoveredCountry extends CountryInfo {
  x: number;
  y: number;
}

const NativeWorldMap = ({
  height = 480,
  showControls = true,
  className = "",
  onCountryClick,
  selectedCountryCode = null,
  focusCountry = null,
}: NativeWorldMapProps) => {
  const [layers, setLayers] = useState({ companies: true, sanctions: true, catalysts: true });
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<HoveredMarker | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<HoveredCountry | null>(null);

  const [trackedMarkers, setTrackedMarkers] = useState<TrackedMarker[]>([]);
  const [sanctionsMarkers, setSanctionsMarkers] = useState<SanctionsMarker[]>([]);
  const [catalystMarkers, setCatalystMarkers] = useState<CatalystMarker[]>([]);
  const [heatByCode, setHeatByCode] = useState<Record<string, number>>({});
  const [infoByKey, setInfoByKey] = useState<Record<string, CountryInfo>>({});
  const [mapDataLoading, setMapDataLoading] = useState(true);

  const [geoFeatures, setGeoFeatures] = useState<any[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const africaSet = useMemo(() => new Set(AFRICA_ISO_CODES), []);

  const projection = useMemo(
    () => geoMercator().center([20, 0]).scale(200).translate([VIEW_W / 2, height / 2]),
    [height],
  );
  const pathGen = useMemo(() => geoPath(projection), [projection]);

  const project = (lon: number, lat: number): [number, number] | null => {
    const p = projection([lon, lat]);
    return p ? [p[0], p[1]] : null;
  };

  // Load topojson
  useEffect(() => {
    let cancelled = false;
    fetch(GEO_URL)
      .then((r) => r.json())
      .then((topo) => {
        if (cancelled) return;
        const fc = feature(topo, topo.objects.countries) as unknown as { features: Array<{ id?: string | number; properties?: { ISO_A2?: string; iso_a2?: string; ISO_A3?: string; iso_a3?: string; name?: string } }> };
        setGeoFeatures(fc.features ?? []);
      })
      .catch((e) => console.error("geo load:", e));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      const [companiesRes, contextRes, catalystsRes, heatRes] = await Promise.all([
        supabase.from("companies").select("name, country_code, scout_score, latitude, longitude")
          .not("latitude", "is", null).not("longitude", "is", null),
        supabase.from("country_context").select("country, country_code, risk_tag, latitude, longitude")
          .or("risk_tag.ilike.%sanction%,risk_tag.ilike.%alert%,risk_tag.ilike.%restricted%,risk_tag.ilike.%elevated%"),
        supabase.from("catalysts").select("id, title, type, company_id, companies:company_id ( name, latitude, longitude )").limit(20),
        supabase.from("country_context").select("country, country_code, heat_intensity, regime_status, risk_tag, flag_emoji"),
      ]);
      if (cancelled) return;

      if (!companiesRes.error && companiesRes.data) {
        setTrackedMarkers(companiesRes.data
          .filter((c) => c.latitude != null && c.longitude != null)
          .map((c) => {
            const score = c.scout_score ?? 0;
            const signal: Signal = score >= 70 ? "ACCUMULATE" : score >= 55 ? "HOLD" : "MONITOR";
            return { name: c.name, country: c.country_code ?? "", coordinates: [Number(c.longitude), Number(c.latitude)], score, signal };
          }));
      } else if (companiesRes.error) console.error("companies:", companiesRes.error);

      if (!contextRes.error && contextRes.data) {
        setSanctionsMarkers(contextRes.data
          .filter((c) => c.latitude != null && c.longitude != null)
          .map((c) => ({ name: `${c.country} — ${c.risk_tag}`, coordinates: [Number(c.longitude), Number(c.latitude)] })));
      } else if (contextRes.error) console.error("country_context:", contextRes.error);

      if (!catalystsRes.error && catalystsRes.data) {
        type CatRow = { id: string; title: string | null; type: string | null; companies: { name: string | null; latitude: number | null; longitude: number | null } | null };
        setCatalystMarkers((catalystsRes.data as unknown as CatRow[])
          .filter((c) => c.companies?.latitude != null && c.companies?.longitude != null)
          .map((c) => ({
            name: `${c.companies!.name ?? ''} — ${c.title ?? c.type ?? "Catalyst"}`,
            coordinates: [Number(c.companies!.longitude), Number(c.companies!.latitude)] as [number, number],
            company_id: c.id,
          })));
      } else if (catalystsRes.error) console.error("catalysts:", catalystsRes.error);

      if (!heatRes.error && heatRes.data) {
        const lookup: Record<string, number> = {};
        const infoLookup: Record<string, CountryInfo> = {};
        type HeatRow = {
          country: string | null; country_code: string | null; heat_intensity: number | string | null;
          regime_status: string | null; risk_tag: string | null; flag_emoji: string | null;
        };
        for (const row of heatRes.data as unknown as HeatRow[]) {
          const v = Math.max(0, Math.min(100, Number(row.heat_intensity) || 0));
          const info: CountryInfo = {
            country: row.country ?? "",
            flag_emoji: row.flag_emoji ?? "",
            regime_status: row.regime_status ?? "",
            risk_tag: row.risk_tag ?? "",
            heat: v,
          };
          if (row.country_code) {
            lookup[String(row.country_code).toUpperCase()] = v;
            infoLookup[String(row.country_code).toUpperCase()] = info;
          }
          if (row.country) {
            lookup[String(row.country).toUpperCase()] = v;
            infoLookup[String(row.country).toUpperCase()] = info;
          }
        }
        setHeatByCode(lookup);
        setInfoByKey(infoLookup);
      } else if (heatRes.error) console.error("heat:", heatRes.error);

      setMapDataLoading(false);
    };
    fetchAll();
    return () => { cancelled = true; };
  }, []);

  const toggleLayer = (key: keyof typeof layers) =>
    setLayers((s) => ({ ...s, [key]: !s[key] }));

  const infoForIso3 = (iso3: string | undefined, geoName: string): CountryInfo | null => {
    if (!iso3 && !geoName) return null;
    const iso2 = iso3 ? ISO3_TO_ISO2[iso3] : undefined;
    return (
      (iso2 ? infoByKey[iso2] : undefined) ??
      (iso3 ? infoByKey[iso3] : undefined) ??
      infoByKey[geoName.toUpperCase()] ??
      null
    );
  };

  // Smoothly recenter on a focused country (ISO3)
  useEffect(() => {
    if (!focusCountry || geoFeatures.length === 0) return;
    const target = geoFeatures.find(
      (g) => NUMERIC_TO_ISO3[String(g.id).padStart(3, "0")] === focusCountry,
    );
    if (!target) return;
    const centroid = geoCentroid(target as never) as [number, number];
    const p = projection(centroid);
    if (!p) return;
    const nextZoom = 2.6;
    setZoom(nextZoom);
    setPan({
      x: -nextZoom * (p[0] - VIEW_W / 2),
      y: -nextZoom * (p[1] - height / 2),
    });
  }, [focusCountry, geoFeatures, projection, height]);

  const handleMarkerEnter = (e: React.MouseEvent, m: TrackedMarker) => {
    const rect = containerRef.current?.getBoundingClientRect();
    setHoveredMarker({
      name: m.name, score: m.score, signal: m.signal,
      x: e.clientX - (rect?.left ?? 0) + 12,
      y: e.clientY - (rect?.top ?? 0) + 12,
    });
  };

  const handleCountryEnter = (e: React.MouseEvent, info: CountryInfo) => {
    const rect = containerRef.current?.getBoundingClientRect();
    setHoveredCountry({
      ...info,
      x: e.clientX - (rect?.left ?? 0) + 14,
      y: e.clientY - (rect?.top ?? 0) + 14,
    });
  };

  // Pan/zoom handlers
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoom((z) => Math.min(6, Math.max(0.8, z * factor)));
  };
  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.px + (e.clientX - dragRef.current.x),
      y: dragRef.current.py + (e.clientY - dragRef.current.y),
    });
  };
  const onMouseUp = () => { dragRef.current = null; };

  const transform = `translate(${pan.x + VIEW_W / 2} ${pan.y + height / 2}) scale(${zoom}) translate(${-VIEW_W / 2} ${-height / 2})`;

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
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border border-border/40 bg-card"
        style={{ height }}
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${height}`}
          width="100%"
          height="100%"
          style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <g transform={transform} style={{ transition: "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}>
            {geoFeatures.map((geo, idx) => {
              const numericId = String(geo.id).padStart(3, "0");
              const iso3 = NUMERIC_TO_ISO3[numericId];
              const isAfrica = iso3 ? africaSet.has(iso3) : false;
              const isSelected = iso3 && iso3 === selectedCountry;
              const isFocused = iso3 && iso3 === focusCountry;
              const geoName: string = geo.properties?.name ?? "";
              const heat = isAfrica
                ? (heatByCode[iso3 ? (ISO3_TO_ISO2[iso3] ?? iso3) : ""] ?? heatByCode[iso3 ?? ""] ?? heatByCode[geoName.toUpperCase()] ?? 0)
                : 0;
              const info = isAfrica ? infoForIso3(iso3, geoName) : null;
              const heatFill =
                heat >= 70 ? `hsl(var(--destructive) / ${0.25 + (heat - 70) * 0.012})`
                : heat >= 40 ? `hsl(var(--primary) / ${0.15 + (heat - 40) * 0.008})`
                : heat > 0   ? `hsl(var(--score-high, 155 55% 42%) / ${0.1 + heat * 0.004})`
                : null;
              const baseFill = isSelected
                ? "hsl(var(--primary) / 0.2)"
                : heatFill ?? (isAfrica ? "hsl(220 15% 14%)" : "hsl(220 15% 8%)");
              const d = pathGen(geo) ?? "";
              return (
                <path
                  key={idx}
                  d={d}
                  fill={baseFill}
                  className={heat >= 70 ? "heat-pulse" : undefined}
                  stroke={
                    isFocused ? "hsl(var(--primary))"
                    : isAfrica ? "hsl(38 100% 50% / 0.3)"
                    : "hsl(220 12% 16%)"
                  }
                  strokeWidth={isFocused ? 1.4 / zoom : isAfrica ? 0.5 / zoom : 0.3 / zoom}
                  style={{ cursor: isAfrica ? "pointer" : "default", outline: "none" }}
                  onClick={() => {
                    if (isAfrica && iso3) {
                      setSelectedCountry(iso3);
                      onCountryClick?.(iso3);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (!isAfrica) return;
                    (e.currentTarget as SVGPathElement).setAttribute("fill", "hsl(38 100% 50% / 0.15)");
                    if (info) handleCountryEnter(e, info);
                  }}
                  onMouseMove={(e) => { if (info) handleCountryEnter(e, info); }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as SVGPathElement).setAttribute("fill", baseFill);
                    setHoveredCountry(null);
                  }}
                />
              );
            })}

            {layers.companies && trackedMarkers.map((m) => {
              const p = project(m.coordinates[0], m.coordinates[1]);
              if (!p) return null;
              const color = SIGNAL_COLOR[m.signal];
              const dim = selectedCountryCode != null &&
                m.country.toUpperCase() !== selectedCountryCode.toUpperCase();
              return (
                <g
                  key={m.name}
                  transform={`translate(${p[0]} ${p[1]})`}
                  opacity={dim ? 0.25 : 1}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => handleMarkerEnter(e, m)}
                  onMouseLeave={() => setHoveredMarker(null)}
                >
                  <circle r={8 / zoom} fill={color} opacity={0.3} className="animate-pulse-slow" />
                  <circle r={5 / zoom} fill={color} stroke="hsl(220 15% 6%)" strokeWidth={1 / zoom} />
                  <title>{`${m.name} — Score ${m.score}`}</title>
                </g>
              );
            })}

            {layers.sanctions && sanctionsMarkers.map((m) => {
              const p = project(m.coordinates[0], m.coordinates[1]);
              if (!p) return null;
              return (
                <g key={m.name} transform={`translate(${p[0]} ${p[1]}) rotate(45)`}>
                  <rect x={-4 / zoom} y={-4 / zoom} width={8 / zoom} height={8 / zoom}
                    fill="hsl(0 72% 51% / 0.8)" stroke="hsl(0 72% 51%)" strokeWidth={1 / zoom} />
                  <title>{m.name}</title>
                </g>
              );
            })}

            {layers.catalysts && catalystMarkers.map((m) => {
              const p = project(m.coordinates[0], m.coordinates[1]);
              if (!p) return null;
              return (
                <g key={`${m.company_id}-${m.name}`} transform={`translate(${p[0]} ${p[1]})`}>
                  <circle r={6 / zoom} fill="transparent" stroke="hsl(38 100% 50%)"
                    strokeWidth={1.5 / zoom} strokeDasharray={`${2 / zoom} ${2 / zoom}`} />
                  <circle r={2 / zoom} fill="hsl(38 100% 50%)" />
                  <title>{m.name}</title>
                </g>
              );
            })}
          </g>
        </svg>

        {mapDataLoading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-card/40 animate-pulse">
            <span className="text-xs font-mono text-primary">Loading intelligence data...</span>
          </div>
        )}

        {hoveredMarker && (
          <div
            className="glass-card pointer-events-none absolute z-10 min-w-[180px] rounded-lg p-3"
            style={{ left: hoveredMarker.x, top: hoveredMarker.y }}
          >
            <div className="font-bold text-sm">{hoveredMarker.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Scout Score: {hoveredMarker.score}</div>
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
