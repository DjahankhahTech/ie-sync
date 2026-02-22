"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useIEStore } from "@/store/ie-store";
import { GCC_CONFIGS } from "@/lib/gcc-config";

// Leaflet is loaded dynamically to avoid SSR issues
// We use a ref-based approach with vanilla Leaflet rather than react-leaflet
// to keep SSR compatibility in Next.js

interface ThreatMarkerData {
  lat: number;
  lng: number;
  designation: string;
  type: string;
  activity: string;
  threat: string;
  confidence: number;
  capabilities: string[];
}

interface NarrativeZoneData {
  lat: number;
  lng: number;
  title: string;
  reach: number;
  velocity: number;
  adversarial: boolean;
  trend: string;
  platform: string;
}

// Convert normalized grid [0-100, 0-100] to real-world lat/lng within GCC AOR bounds
const GCC_BOUNDS: Record<string, { latMin: number; latMax: number; lngMin: number; lngMax: number }> = {
  INDOPACOM: { latMin: -10, latMax: 55,  lngMin: 80,   lngMax: 180 },
  CENTCOM:   { latMin: 10,  latMax: 45,  lngMin: 30,   lngMax: 75  },
  EUCOM:     { latMin: 35,  latMax: 72,  lngMin: -10,  lngMax: 60  },
  AFRICOM:   { latMin: -35, latMax: 35,  lngMin: -20,  lngMax: 55  },
  SOUTHCOM:  { latMin: -55, latMax: 25,  lngMin: -90,  lngMax: -30 },
  NORTHCOM:  { latMin: 20,  latMax: 75,  lngMin: -140, lngMax: -60 },
};

function gridToLatLng(grid: [number, number], gccId: string): [number, number] {
  const bounds = GCC_BOUNDS[gccId] || GCC_BOUNDS.INDOPACOM;
  const lat = bounds.latMin + (grid[1] / 100) * (bounds.latMax - bounds.latMin);
  const lng = bounds.lngMin + (grid[0] / 100) * (bounds.lngMax - bounds.lngMin);
  return [lat, lng];
}

// Narrative zone positions (hardcoded per GCC for visual fidelity)
const GCC_NARRATIVE_POSITIONS: Record<string, Array<[number, number]>> = {
  INDOPACOM: [[35, 120], [24, 121], [10, 125], [26, 127]],
  CENTCOM:   [[15, 44], [33, 44], [24, 56], [23, 57]],
  EUCOM:     [[50, 30], [52, 21], [59, 24], [47, 15]],
  AFRICOM:   [[12, -3], [13, 2], [5, 36], [15, 45]],
  SOUTHCOM:  [[10, -66], [23, -82], [-15, -47], [-4, -76]],
  NORTHCOM:  [[39, -77], [34, -118], [45, -73], [29, -95]],
};

function getThreatColor(threat: string): string {
  switch (threat) {
    case "CRITICAL": return "#ff0040";
    case "HIGH": return "#ff6600";
    case "MEDIUM": return "#ffcc00";
    case "LOW": return "#00ff88";
    default: return "#888888";
  }
}

export default function TacticalMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circlesRef = useRef<any[]>([]);
  // Signals that leafletMapRef.current is populated — marker effects depend on this
  const [mapReady, setMapReady] = useState(false);

  const { activeGCC, threatEntities, narrativeThreads } = useIEStore();
  const gcc = GCC_CONFIGS[activeGCC];

  const threatMarkers = useMemo<ThreatMarkerData[]>(() =>
    threatEntities.map((te) => {
      const [lat, lng] = gridToLatLng(te.grid, activeGCC);
      return {
        lat, lng,
        designation: te.designation,
        type: te.type,
        activity: te.activity,
        threat: te.threat,
        confidence: te.confidence,
        capabilities: te.capabilities,
      };
    }), [threatEntities, activeGCC]);

  const narrativeZones = useMemo<NarrativeZoneData[]>(() => {
    const positions = GCC_NARRATIVE_POSITIONS[activeGCC] || GCC_NARRATIVE_POSITIONS.INDOPACOM;
    return narrativeThreads.slice(0, positions.length).map((nt, i) => ({
      lat: positions[i][0],
      lng: positions[i][1],
      title: nt.title,
      reach: nt.reach,
      velocity: nt.velocity,
      adversarial: nt.adversarial,
      trend: nt.trend,
      platform: nt.platform,
    }));
  }, [narrativeThreads, activeGCC]);

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current) return;

    // Guard against Leaflet "Map container is already initialized" —
    // React StrictMode double-invokes effects; the async import() can
    // resolve after cleanup has run, re-entering on a container that
    // Leaflet has already touched.  Checking _leaflet_id on the DOM
    // node is the only reliable synchronous guard.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((mapRef.current as any)._leaflet_id) return;

    // Local flag so the cleanup knows whether THIS invocation won the race
    let cancelled = false;

    // Inject Leaflet CSS once (idempotent)
    if (!document.querySelector('link[data-leaflet-css]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      link.setAttribute("data-leaflet-css", "1");
      document.head.appendChild(link);
    }

    // Dynamic import to avoid SSR
    import("leaflet").then((L) => {
      // If cleanup already ran (StrictMode second call tore things down),
      // or the container was re-used by a concurrent call, bail out.
      if (cancelled || !mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((mapRef.current as any)._leaflet_id) return;

      // Fix default icon paths for Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current, {
        center: [gcc.mapCenter[1], gcc.mapCenter[0]],
        zoom: gcc.mapZoom,
        zoomControl: false,
        attributionControl: false,
      });

      // ── Satellite base layer (ESRI World Imagery) ──────────────────
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "ESRI" }
      ).addTo(map);

      // ── Labels overlay (ESRI Reference layer — roads/labels/borders) ──
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, opacity: 0.7, attribution: "ESRI" }
      ).addTo(map);

      // ── Tactical dark vignette overlay ─────────────────────────────
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
        { maxZoom: 19, opacity: 0.15, subdomains: "abcd" }
      ).addTo(map);

      // ── Zoom control (custom position) ──────────────────────────────
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // ── Attribution (subtle) ────────────────────────────────────────
      L.control.attribution({
        position: "bottomleft",
        prefix: '<span style="color:#444;font-size:9px">ESRI World Imagery | OSINT</span>',
      }).addTo(map);

      leafletMapRef.current = map;
      // Signal to marker/circle effects that the map is ready to receive layers
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      setMapReady(false);
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map when GCC changes (fly to new center) — guard with mapReady
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    const map = leafletMapRef.current;
    map.flyTo([gcc.mapCenter[1], gcc.mapCenter[0]], gcc.mapZoom, {
      animate: true,
      duration: 1.5,
    });
  }, [activeGCC, gcc.mapCenter, gcc.mapZoom, mapReady]);

  // Update threat markers when GCC/entities change — depends on mapReady to avoid race
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;

    import("leaflet").then((L) => {
      const map = leafletMapRef.current;
      if (!map) return;

      // Clear old markers
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];

      // Add threat entity markers
      threatMarkers.forEach((te) => {
        const color = getThreatColor(te.threat);

        // Custom tactical marker SVG
        const svgIcon = L.divIcon({
          className: "",
          html: `
            <div style="position:relative;width:36px;height:36px">
              <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" style="width:36px;height:36px;filter:drop-shadow(0 0 6px ${color})">
                <!-- Outer pulsing ring -->
                <circle cx="18" cy="18" r="16" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.4"/>
                <!-- Inner marker shape — diamond for threat entity -->
                <polygon points="18,4 32,18 18,32 4,18" fill="${color}" fill-opacity="0.85" stroke="${color}" stroke-width="1"/>
                <!-- Center dot -->
                <circle cx="18" cy="18" r="3" fill="#000" opacity="0.8"/>
                <!-- Threat type indicator: crosshair for STATE, shield for PROXY -->
                ${te.type === "STATE"
                  ? `<line x1="18" y1="10" x2="18" y2="26" stroke="#000" stroke-width="1.5" opacity="0.7"/>
                     <line x1="10" y1="18" x2="26" y2="18" stroke="#000" stroke-width="1.5" opacity="0.7"/>`
                  : `<circle cx="18" cy="18" r="5" fill="none" stroke="#000" stroke-width="1.5" opacity="0.7"/>`
                }
              </svg>
              ${te.threat === "CRITICAL" ? `
              <div style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;background:#ff0040;border-radius:50%;border:1px solid #fff;animation:pulse 1.2s infinite"></div>` : ""}
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([te.lat, te.lng], { icon: svgIcon });

        // Tactical popup
        marker.bindPopup(`
          <div style="background:#0a0e1a;border:1px solid ${color};color:#e2e8f0;font-family:monospace;font-size:11px;padding:10px;min-width:220px;border-radius:4px">
            <div style="color:${color};font-weight:bold;font-size:12px;margin-bottom:6px;letter-spacing:1px">
              ◆ ${te.designation}
            </div>
            <div style="color:#94a3b8;margin-bottom:4px">TYPE: <span style="color:#e2e8f0">${te.type}</span></div>
            <div style="color:#94a3b8;margin-bottom:4px">THREAT: <span style="color:${color};font-weight:bold">${te.threat}</span></div>
            <div style="color:#94a3b8;margin-bottom:4px">CONFIDENCE: <span style="color:#00d4ff">${te.confidence}%</span></div>
            <div style="color:#94a3b8;margin-bottom:6px">ACTIVITY:</div>
            <div style="color:#e2e8f0;font-size:10px;margin-bottom:6px;line-height:1.4">${te.activity}</div>
            <div style="color:#94a3b8;margin-bottom:3px">CAPABILITIES:</div>
            <div style="display:flex;flex-wrap:wrap;gap:3px">
              ${te.capabilities.map(c => `<span style="background:${color}22;border:1px solid ${color}55;color:${color};padding:1px 5px;border-radius:2px;font-size:9px">${c}</span>`).join("")}
            </div>
          </div>
        `, {
          className: "tactical-popup",
          maxWidth: 260,
        });

        // AoI circle around threat entity
        const aoiCircle = L.circle([te.lat, te.lng], {
          radius: te.threat === "CRITICAL" ? 300000 : te.threat === "HIGH" ? 200000 : 120000,
          color: color,
          fillColor: color,
          fillOpacity: 0.04,
          weight: 1,
          dashArray: "4 6",
        }).addTo(map);
        markersRef.current.push(aoiCircle);

        marker.addTo(map);
        markersRef.current.push(marker);
      });
    });
  }, [threatMarkers, activeGCC, mapReady]);

  // Update narrative influence zones — depends on mapReady to avoid race
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;

    import("leaflet").then((L) => {
      const map = leafletMapRef.current;
      if (!map) return;

      // Clear old circles
      circlesRef.current.forEach((c) => map.removeLayer(c));
      circlesRef.current = [];

      narrativeZones.forEach((nz) => {
        const color = nz.adversarial
          ? (nz.trend === "RISING" ? "#ff0040" : "#ff6600")
          : "#00d4ff";

        // Reach radius scaled to realistic visual (reach in users → km proxy)
        const radiusKm = Math.sqrt(nz.reach / 1000) * 8000;

        const zone = L.circle([nz.lat, nz.lng], {
          radius: Math.min(radiusKm, 1500000),
          color: color,
          fillColor: color,
          fillOpacity: nz.adversarial ? 0.07 : 0.04,
          weight: nz.adversarial ? 1.5 : 1,
          dashArray: nz.adversarial ? "6 4" : "3 6",
        });

        zone.bindTooltip(`
          <div style="background:#0a0e1a;border:1px solid ${color};color:#e2e8f0;font-family:monospace;font-size:10px;padding:8px;border-radius:3px;max-width:200px">
            <div style="color:${color};font-weight:bold;margin-bottom:4px">${nz.adversarial ? "⚠ HOSTILE" : "✓ FRIENDLY"} NARRATIVE</div>
            <div style="font-size:10px;margin-bottom:3px">${nz.title}</div>
            <div style="color:#94a3b8">REACH: <span style="color:#e2e8f0">${(nz.reach / 1000000).toFixed(1)}M</span></div>
            <div style="color:#94a3b8">VELOCITY: <span style="color:#e2e8f0">${nz.velocity.toLocaleString()}/hr</span></div>
            <div style="color:#94a3b8">TREND: <span style="color:${nz.trend === "RISING" ? "#ff0040" : nz.trend === "FALLING" ? "#00ff88" : "#ffcc00"}">${nz.trend}</span></div>
            <div style="color:#64748b;font-size:9px;margin-top:3px">${nz.platform}</div>
          </div>
        `, { sticky: true, className: "tactical-tooltip" });

        zone.addTo(map);
        circlesRef.current.push(zone);

        // Epicenter marker for narrative zone
        if (nz.adversarial) {
          const epicenter = L.divIcon({
            className: "",
            html: `
              <div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 8px ${color}88;opacity:0.9"></div>
            `,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          });
          const epMarker = L.marker([nz.lat, nz.lng], { icon: epicenter }).addTo(map);
          circlesRef.current.push(epMarker);
        }
      });
    });
  }, [narrativeZones, activeGCC, mapReady]);

  return (
    <div className="relative w-full h-full">
      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" style={{ background: "#0a0e1a" }} />

      {/* ── Tactical HUD overlays ─────────────────────────────────── */}

      {/* Top-left: GCC designation badge */}
      <div className="absolute top-3 left-3 z-[1000] pointer-events-none">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-bold tracking-widest"
          style={{
            background: "rgba(10,14,26,0.88)",
            border: `1px solid ${gcc.color}`,
            color: gcc.color,
            boxShadow: `0 0 12px ${gcc.color}40`,
          }}
        >
          <span>{gcc.flag}</span>
          <span>{gcc.abbr}</span>
          <span style={{ color: "#94a3b8", fontWeight: 400 }}>IE OVERLAY</span>
        </div>
      </div>

      {/* Top-right: Map mode / classification */}
      <div className="absolute top-3 right-3 z-[1000] pointer-events-none">
        <div
          className="flex flex-col gap-1 items-end"
        >
          <div className="px-2 py-1 rounded text-xs font-mono"
            style={{ background: "rgba(10,14,26,0.88)", border: "1px solid #334155", color: "#64748b" }}>
            ESRI WORLD IMAGERY
          </div>
          <div className="px-2 py-1 rounded text-xs font-mono"
            style={{ background: "rgba(10,14,26,0.88)", border: "1px solid #334155", color: "#64748b" }}>
            COORD SYS: WGS-84
          </div>
        </div>
      </div>

      {/* Bottom-left: Legend */}
      <div className="absolute bottom-8 left-3 z-[1000] pointer-events-none">
        <div
          className="rounded p-2 text-xs font-mono"
          style={{ background: "rgba(10,14,26,0.88)", border: "1px solid #1e293b" }}
        >
          <div className="text-slate-500 text-xs mb-1.5 tracking-widest">LEGEND</div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rotate-45" style={{ background: "#ff0040", opacity: 0.9 }} />
              <span className="text-slate-400">CRITICAL THREAT</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rotate-45" style={{ background: "#ff6600", opacity: 0.9 }} />
              <span className="text-slate-400">HIGH THREAT</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rotate-45" style={{ background: "#ffcc00", opacity: 0.9 }} />
              <span className="text-slate-400">MEDIUM THREAT</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-px" style={{ background: "#ff0040", opacity: 0.6 }} />
              <span className="text-slate-400">HOSTILE NARRATIVE ZONE</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-px" style={{ background: "#00d4ff", opacity: 0.6 }} />
              <span className="text-slate-400">FRIENDLY NARRATIVE ZONE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-right: Threat count summary */}
      <div className="absolute bottom-8 right-14 z-[1000] pointer-events-none">
        <div
          className="rounded p-2 text-xs font-mono flex flex-col gap-1"
          style={{ background: "rgba(10,14,26,0.88)", border: "1px solid #1e293b" }}
        >
          <div className="text-slate-500 tracking-widest mb-0.5">ENTITIES</div>
          <div style={{ color: "#ff0040" }}>
            CRIT: {threatEntities.filter(t => t.threat === "CRITICAL").length}
          </div>
          <div style={{ color: "#ff6600" }}>
            HIGH: {threatEntities.filter(t => t.threat === "HIGH").length}
          </div>
          <div style={{ color: "#64748b" }}>
            NARR: {narrativeThreads.filter(n => n.adversarial).length} HOSTILE
          </div>
        </div>
      </div>

      {/* Grid reticle corners (tactical frame) */}
      {[
        "top-0 left-0 border-t border-l",
        "top-0 right-0 border-t border-r",
        "bottom-0 left-0 border-b border-l",
        "bottom-0 right-0 border-b border-r",
      ].map((cls, i) => (
        <div
          key={i}
          className={`absolute ${cls} w-6 h-6 z-[1000] pointer-events-none`}
          style={{ borderColor: `${gcc.color}80` }}
        />
      ))}

      <style>{`
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-popup-tip-container {
          display: none !important;
        }
        .leaflet-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-control-zoom {
          border: 1px solid #1e293b !important;
          background: rgba(10,14,26,0.9) !important;
        }
        .leaflet-control-zoom a {
          background: transparent !important;
          color: #64748b !important;
          border-color: #1e293b !important;
        }
        .leaflet-control-zoom a:hover {
          color: #e2e8f0 !important;
          background: rgba(30,41,59,0.8) !important;
        }
        .leaflet-control-attribution {
          background: rgba(10,14,26,0.7) !important;
          color: #334155 !important;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
