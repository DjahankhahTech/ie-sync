"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useIEStore } from "@/store/ie-store";
import { GCC_CONFIGS, type GCCId } from "@/lib/gcc-config";
import { getHistoricalThreats, getHistoricalNarratives, layerOf, type IELayer } from "@/lib/threat-library";
import { getStrategicSites, getAllStrategicSites, MARITIME_CHOKEPOINTS, SITE_META, type SiteCategory } from "@/lib/strategic-locations";
import { resolveThreatLocation } from "@/lib/threat-geo";
import type { CableLine } from "./TacticalMap";

// Threat positions are resolved from each entity's stated location by
// lib/threat-geo.ts. The AOR-bounds grid projection that used to sit here
// turned an array index into a coordinate and has been removed.

const ALL_GCCS = Object.keys(GCC_CONFIGS) as GCCId[];
type MapScope = "ALL" | GCCId;

const TacticalMap = dynamic(() => import("./TacticalMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center text-[#475569] text-xs font-mono">LOADING TACTICAL MAP…</div>,
});

// Full-width dedicated tab for the IE Tactical Overlay (OIE information layers).
// All CCMDs render on one world map by default; an on-map CCMD selector lets the
// planner focus a single theater. The overlay is weighted toward the
// INFORMATIONAL picture of US adversary nations.
export function IEMapTab() {
  const { activeGCC, threatEntities, narrativeThreads } = useIEStore();

  // CCMD scope for the map (default: all theaters on one map).
  const [mapScope, setMapScope] = useState<MapScope>("ALL");
  const scopeGCCs: GCCId[] = mapScope === "ALL" ? ALL_GCCS : [mapScope];
  const isAll = mapScope === "ALL";

  // OIE information layers — INFORMATIONAL is emphasized (listed first).
  const [activeLayers, setActiveLayers] = useState<Record<IELayer, boolean>>({ INFORMATIONAL: true, TECHNICAL: true, PHYSICAL: true, UNKNOWN: true });
  const toggleLayer = (l: IELayer) => setActiveLayers((p) => ({ ...p, [l]: !p[l] }));

  // Threats for each in-scope CCMD, with real coordinates precomputed. Live
  // store threats are used for the active AOR when available; otherwise the
  // sourced reference library. Each carries _layer + lat/lng.
  // Coordinates come from resolving the entity's stated location, never from a
  // synthesised grid. Entities whose location is non-physical (cyberspace,
  // global platforms) resolve to null and are counted, not plotted.
  const threatsFor = (g: GCCId) => {
    const base = g === activeGCC && threatEntities.length > 0 ? threatEntities : getHistoricalThreats(g);
    return base.map((e) => {
      const geo = resolveThreatLocation(e.location);
      return {
        ...e,
        _layer: layerOf(e),
        _gcc: g,
        lat: geo?.lat,
        lng: geo?.lng,
        _place: geo?.place,
        _precision: geo?.precision,
      };
    });
  };
  const allThreats = scopeGCCs.flatMap(threatsFor);
  const visibleThreats = allThreats.filter((e) => activeLayers[e._layer]);
  const mappableThreats = visibleThreats.filter((e) => typeof e.lat === "number");
  const unmappedCount = visibleThreats.length - mappableThreats.length;
  const liveForScope = scopeGCCs.includes(activeGCC) && threatEntities.length > 0;

  // Narratives only render as map zones when the focused scope is the active
  // (live) AOR — the map positions narrative zones by the active GCC.
  const baseNarratives = !isAll && mapScope === activeGCC
    ? (narrativeThreads.length ? narrativeThreads : getHistoricalNarratives(activeGCC))
    : [];
  const visibleNarratives = activeLayers.INFORMATIONAL ? baseNarratives : [];

  // ── Adversary information picture (drives the on-map informational panel) ──
  // Hostile narratives + INFORMATIONAL-layer state/proxy threats across scope.
  // Only surface items that carry a verified source link. Narratives are drawn
  // from the sourced reference library so every panel item has a verified link
  // (live AI narratives are shown as map zones; the sourced library backs the
  // panel's adversary information picture).
  const advNarratives = scopeGCCs
    .flatMap((g) => getHistoricalNarratives(g))
    .filter((n) => n.adversarial && n.sourceUrl);
  const advInfoThreats = allThreats.filter((e) => e._layer === "INFORMATIONAL" && (e.type === "STATE" || e.type === "PROXY") && e.sourceUrl);

  const layerCounts: Record<IELayer, number> = {
    PHYSICAL: allThreats.filter((e) => e._layer === "PHYSICAL").length,
    TECHNICAL: allThreats.filter((e) => e._layer === "TECHNICAL").length,
    INFORMATIONAL: allThreats.filter((e) => e._layer === "INFORMATIONAL").length + baseNarratives.length,
    UNKNOWN: allThreats.filter((e) => e._layer === "UNKNOWN").length,
  };
  const LAYER_META: { key: IELayer; label: string; color: string; desc: string }[] = [
    { key: "INFORMATIONAL", label: "INFORMATIONAL", color: "#f59e0b", desc: "narratives · media · influence operations" },
    { key: "TECHNICAL", label: "TECHNICAL", color: "#00d4ff", desc: "networks · cyber · SIGINT — information systems" },
    { key: "PHYSICAL", label: "PHYSICAL", color: "#10b981", desc: "platforms · emitters · installations · geography" },
    { key: "UNKNOWN", label: "LAYER UNKNOWN", color: "#64748b", desc: "couldn't tell which information layer this actor belongs to — shown rather than guessed" },
  ];

  // Global infrastructure layers (flights & AIS removed per OIE focus).
  const [globalLayers, setGlobalLayers] = useState({ shipping: true, cables: false, sites: true });
  const [cables, setCables] = useState<CableLine[]>([]);
  const [cablesLoading, setCablesLoading] = useState(false);
  const [cablesNote, setCablesNote] = useState<string | null>(null);

  const loadCables = async () => {
    if (cables.length > 0) return;
    setCablesLoading(true); setCablesNote(null);
    try {
      const r = await fetch(`/api/cables`);
      const j = await r.json();
      if (j.error) setCablesNote(j.error); else setCables(j.cables ?? []);
    } catch { setCablesNote("Cable dataset unreachable."); }
    finally { setCablesLoading(false); }
  };

  const toggleGlobal = (k: keyof typeof globalLayers) => {
    setGlobalLayers((p) => {
      const next = { ...p, [k]: !p[k] };
      if (k === "cables" && next.cables) loadCables();
      return next;
    });
  };

  const scopeSites = isAll ? getAllStrategicSites() : getStrategicSites(mapScope);
  const mapSites = [
    ...(globalLayers.sites ? scopeSites : []),
    ...(globalLayers.shipping ? MARITIME_CHOKEPOINTS : []),
  ];
  const GLOBAL_META: { key: keyof typeof globalLayers; label: string; color: string; count: number; busy?: boolean }[] = [
    { key: "sites", label: "STRATEGIC SITES", color: "#22d3ee", count: scopeSites.length },
    { key: "shipping", label: "MARITIME CHOKEPOINTS", color: "#f59e0b", count: MARITIME_CHOKEPOINTS.length },
    { key: "cables", label: "SUBMARINE CABLES", color: "#a855f7", count: cables.length, busy: cablesLoading },
  ];

  // Distinct site categories present (for the legend)
  const siteCats = Array.from(new Set(mapSites.map((s) => s.category))) as SiteCategory[];

  // View scope for the map
  const view = isAll
    ? { center: [20, 0] as [number, number], zoom: 2 }
    : { center: [GCC_CONFIGS[mapScope].mapCenter[1], GCC_CONFIGS[mapScope].mapCenter[0]] as [number, number], zoom: GCC_CONFIGS[mapScope].mapZoom };
  const scopeLabel = isAll ? "ALL THEATERS" : GCC_CONFIGS[mapScope].abbr;
  const scopeAor = isAll ? "GLOBAL — ALL THEATERS" : GCC_CONFIGS[mapScope].aor.toUpperCase();

  return (
    <div className="flex flex-col h-full">
      {/* Control strip — layers only (CCMD selector is on the map) */}
      <div className="flex-shrink-0 border-b border-[#1e3a5f] bg-[#070d1a] px-4 py-2 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="text-[#00d4ff] text-sm font-black tracking-widest">MAP — WHERE THE INFORMATION FIGHT IS HAPPENING</div>
            <div className="text-[#475569] text-[10px] font-mono">
              SATELLITE IMAGERY · {scopeAor} · Layers: what people believe (INFORMATIONAL), the systems that carry it (TECHNICAL), the hardware and places (PHYSICAL)
              {!liveForScope && <span className="ml-2 px-1.5 py-0.5 border border-[#f59e0b] text-[#f59e0b] rounded">REFERENCE DATA — open Adversary Estimate to generate the live picture</span>}
              {unmappedCount > 0 && (
                <span
                  className="ml-2 px-1.5 py-0.5 border border-[#64748b] text-[#64748b] rounded"
                  title="These entities operate in cyberspace or across global platforms. They have no physical position to plot, so they are listed in the IE Overlay rather than placed on the map."
                >
                  {unmappedCount} NOT MAPPABLE
                </span>
              )}
            </div>
          </div>
          {/* OIE layer toggles */}
          <div className="flex gap-1.5 text-[10px]">
            {LAYER_META.map((lm) => (
              <button key={lm.key} onClick={() => toggleLayer(lm.key)} title={lm.desc}
                className="px-2.5 py-1 border rounded font-bold tracking-wider transition-colors"
                style={activeLayers[lm.key] ? { borderColor: lm.color, color: lm.color, background: `${lm.color}18` } : { borderColor: "#334155", color: "#64748b" }}>
                {activeLayers[lm.key] ? "◉" : "○"} {lm.label} <span className="opacity-70">({layerCounts[lm.key]})</span>
              </button>
            ))}
          </div>
        </div>
        {/* Infrastructure toggles */}
        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
          <span className="text-[#475569] tracking-wider mr-1">INFRASTRUCTURE:</span>
          {GLOBAL_META.map((g) => (
            <button key={g.key} onClick={() => toggleGlobal(g.key)}
              className="px-2.5 py-1 border rounded font-bold tracking-wider transition-colors"
              style={globalLayers[g.key] ? { borderColor: g.color, color: g.color, background: `${g.color}18` } : { borderColor: "#334155", color: "#64748b" }}>
              {globalLayers[g.key] ? "◉" : "○"} {g.label} <span className="opacity-70">({g.busy ? "…" : g.count})</span>
            </button>
          ))}
          <span className="text-[#475569] ml-auto">
            {globalLayers.cables && cablesNote ? <span className="text-[#f59e0b]">{cablesNote}</span>
              : "Strategic sites, maritime chokepoints, and submarine cables — all-nation posture."}
          </span>
        </div>
        {/* Site legend */}
        {globalLayers.sites && siteCats.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap text-[9px] text-[#94a3b8]">
            {siteCats.map((c) => (
              <span key={c} className="flex items-center gap-1">
                <span style={{ color: SITE_META[c].color }}>{SITE_META[c].symbol}</span> {SITE_META[c].label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Full-bleed map with on-map controls */}
      <div className="flex-1 relative overflow-hidden">
        <TacticalMap
          entities={mappableThreats}
          narratives={visibleNarratives}
          cables={globalLayers.cables ? cables : []}
          sites={mapSites}
          viewCenter={view.center}
          viewZoom={view.zoom}
          scopeLabel={scopeLabel}
        />

        {/* On-map CCMD selector (top-center) */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#0891b2] bg-[rgba(10,14,26,0.92)] shadow-lg">
            <span className="text-[#475569] text-[9px] font-mono tracking-widest">THEATER</span>
            <select
              value={mapScope}
              onChange={(e) => setMapScope(e.target.value as MapScope)}
              className="bg-[#0f1829] border border-[#1e3a5f] text-[#00d4ff] text-[12px] font-bold tracking-wider rounded px-2 py-1 focus:outline-none focus:border-[#0891b2] cursor-pointer"
            >
              <option value="ALL">🌐 ALL THEATERS</option>
              {ALL_GCCS.map((g) => (
                <option key={g} value={g}>{GCC_CONFIGS[g].flag} {GCC_CONFIGS[g].abbr}</option>
              ))}
            </select>
          </div>
        </div>

        {/* On-map ADVERSARY INFORMATION panel (right rail) — emphasizes the
            informational picture of US adversary nations. */}
        {activeLayers.INFORMATIONAL && (advNarratives.length > 0 || advInfoThreats.length > 0) && (
          <div className="absolute top-16 right-3 bottom-16 w-[300px] z-[1000] pointer-events-auto flex flex-col rounded border border-[#f59e0b55] bg-[rgba(10,14,26,0.92)] shadow-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-[#f59e0b33] flex items-center gap-2 flex-shrink-0">
              <span className="text-[#f59e0b]">⚑</span>
              <div className="text-[#f59e0b] text-[11px] font-black tracking-widest">ADVERSARY INFORMATION ACTIVITY</div>
            </div>
            <div className="overflow-y-auto px-3 py-2 space-y-3 text-[10px]">
              {/* Hostile narratives */}
              {advNarratives.length > 0 && (
                <div>
                  <div className="text-[#475569] text-[9px] tracking-widest mb-1">HOSTILE NARRATIVES ({advNarratives.length})</div>
                  <div className="space-y-1.5">
                    {advNarratives.map((n) => (
                      <div key={n.id} className="border border-[#1e3a5f] rounded p-1.5 bg-[#070d1a]">
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="text-[#e2e8f0] text-[10px] font-bold leading-snug">{n.title}</div>
                          <span className="text-[8px] font-mono flex-shrink-0" style={{ color: n.trend === "RISING" ? "#ef4444" : n.trend === "FALLING" ? "#10b981" : "#f59e0b" }}>{n.trend}</span>
                        </div>
                        <div className="text-[#94a3b8] text-[9px] mt-0.5">{n.platform} · reach ~{(n.reach / 1e6).toFixed(1)}M</div>
                        {n.sourceUrl && (
                          <a href={n.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#0891b2] text-[9px] hover:text-[#00d4ff] underline">↗ {n.sourceLabel || "source"}</a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Informational-layer adversary actors */}
              {advInfoThreats.length > 0 && (
                <div>
                  <div className="text-[#475569] text-[9px] tracking-widest mb-1">INFLUENCE ACTORS ({advInfoThreats.length})</div>
                  <div className="space-y-1.5">
                    {advInfoThreats.map((e) => (
                      <div key={e.id} className="border border-[#1e3a5f] rounded p-1.5 bg-[#070d1a]">
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="text-[#e2e8f0] text-[10px] font-bold leading-snug">{e.designation}</div>
                          <span className="text-[8px] font-mono flex-shrink-0" style={{ color: e.threat === "CRITICAL" ? "#ef4444" : e.threat === "HIGH" ? "#f97316" : "#f59e0b" }}>{e.threat}</span>
                        </div>
                        <div className="text-[#94a3b8] text-[9px] mt-0.5 leading-snug">{e.activity}</div>
                        {e.sourceUrl && (
                          <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#0891b2] text-[9px] hover:text-[#00d4ff] underline">↗ {e.sourceLabel || "source"}</a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
