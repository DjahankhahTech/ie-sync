"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useIEStore } from "@/store/ie-store";
import { GCC_CONFIGS } from "@/lib/gcc-config";
import type { ThreatEntity, NarrativeThread } from "@/lib/mock-data";
import { SITE_META } from "@/lib/strategic-locations";
import { resolveThreatLocation, precisionNote, type GeoPrecision } from "@/lib/threat-geo";

export interface CableLine { name: string; segments: [number, number][][] }
export interface ShipDot { mmsi: number; lat: number; lng: number; name: string; sog: number | null; cog: number | null; type: string }
export interface FlightDot { lat: number; lng: number; callsign: string; id: string; heading: number | null; altitude: number | null; category?: "COMMERCIAL" | "NONCOMMERCIAL" | "MILITARY"; origin?: string; originName?: string; dest?: string; destName?: string }
export interface MapSite { name: string; lat: number; lng: number; category: string; note: string }

interface TacticalMapProps {
  // When provided, the map renders these (already layer-filtered, possibly
  // historical) instead of the live store entities. Falls back to the store.
  entities?: ThreatEntity[];
  narratives?: NarrativeThread[];
  // Global infrastructure / tracking layers (rendered when arrays are non-empty)
  cables?: CableLine[];
  flights?: FlightDot[];
  sites?: MapSite[];
  ships?: ShipDot[];
  // Optional view override (used by the multi-CCMD "ALL" scope). When set, the
  // map centers/zooms here instead of following the active GCC.
  viewCenter?: [number, number];
  viewZoom?: number;
  scopeLabel?: string;
}

// Leaflet is loaded dynamically to avoid SSR issues
// We use a ref-based approach with vanilla Leaflet rather than react-leaflet
// to keep SSR compatibility in Next.js

interface ThreatMarkerData {
  lat: number;
  lng: number;
  /** Gazetteer entry the location string resolved to. */
  place: string;
  /** How coarse that resolution is — surfaced in the popup. */
  precision: GeoPrecision;
  designation: string;
  type: string;
  activity: string;
  threat: string;
  confidence: number;
  capabilities: string[];
  sourceUrl?: string;
  sourceLabel?: string;
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

// Threat-entity positions come from lib/threat-geo.ts, which resolves the
// entity's stated location to a coarse real-world centroid or declines to
// place it. The old grid→AOR-bounds projection is gone: it turned an array
// index into a coordinate.

// Narrative zone positions (hardcoded per GCC for visual fidelity)
const GCC_NARRATIVE_POSITIONS: Record<string, Array<[number, number]>> = {
  INDOPACOM: [[35, 120], [24, 121], [10, 125], [26, 127]],
  CENTCOM:   [[15, 44], [33, 44], [24, 56], [23, 57]],
  EUCOM:     [[50, 30], [52, 21], [59, 24], [47, 15]],
  AFRICOM:   [[12, -3], [13, 2], [5, 36], [15, 45]],
  SOUTHCOM:  [[10, -66], [23, -82], [-15, -47], [-4, -76]],
  NORTHCOM:  [[39, -77], [34, -118], [45, -73], [29, -95]],
  SPACECOM:  [[40, 116], [39, -104], [62, 41], [28, 102]],
  CYBERCOM:  [[56, 38], [40, 116], [39, 126], [36, 51]],
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

export default function TacticalMap({ entities, narratives, cables, flights, sites, ships, viewCenter, viewZoom, scopeLabel }: TacticalMapProps = {}) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circlesRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalRef = useRef<any[]>([]);
  // Signals that leafletMapRef.current is populated — marker effects depend on this
  const [mapReady, setMapReady] = useState(false);

  const { activeGCC, threatEntities: storeThreats, narrativeThreads: storeNarratives } = useIEStore();
  const threatEntities = entities ?? storeThreats;
  const narrativeThreads = narratives ?? storeNarratives;
  const gcc = GCC_CONFIGS[activeGCC];

  // Only entities whose stated location names a real place get a marker.
  // Anything non-physical ("Cyberspace", "PRC-directed — global social media")
  // is dropped here and listed in the overlay instead: a coordinate on this map
  // reads as a locational claim, so it has to be one the data supports.
  const threatMarkers = useMemo<ThreatMarkerData[]>(() =>
    threatEntities.flatMap((te) => {
      // Prefer explicit coordinates (multi-CCMD "ALL" scope precomputes them).
      const explicit = te as unknown as { lat?: number; lng?: number; _place?: string; _precision?: GeoPrecision };
      const resolved = typeof explicit.lat === "number" && typeof explicit.lng === "number"
        ? { lat: explicit.lat, lng: explicit.lng, place: explicit._place ?? te.location, precision: explicit._precision ?? ("COUNTRY" as GeoPrecision) }
        : resolveThreatLocation(te.location);
      if (!resolved) return [];
      const { lat, lng } = resolved;
      return [{
        lat, lng,
        place: resolved.place,
        precision: resolved.precision,
        designation: te.designation,
        sourceUrl: te.sourceUrl,
        sourceLabel: te.sourceLabel,
        type: te.type,
        activity: te.activity,
        threat: te.threat,
        confidence: te.confidence,
        capabilities: te.capabilities,
      }];
      // No activeGCC dependency: positions now come from the entity's own
      // location string, not from the active AOR's bounding box.
    }), [threatEntities]);

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
        center: viewCenter ?? [gcc.mapCenter[1], gcc.mapCenter[0]],
        zoom: viewZoom ?? gcc.mapZoom,
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

  // Update map view when GCC or explicit view scope changes — guard with mapReady
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    const map = leafletMapRef.current;
    const center = viewCenter ?? [gcc.mapCenter[1], gcc.mapCenter[0]];
    const zoom = viewZoom ?? gcc.mapZoom;
    map.flyTo(center, zoom, { animate: true, duration: 1.5 });
  }, [activeGCC, gcc.mapCenter, gcc.mapZoom, viewCenter, viewZoom, mapReady]);

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
                <!-- Actor-type glyph: square for STATE, ring for PROXY/other.
                     Deliberately NOT a crosshair — these are coarse locality
                     associations, and reticle iconography reads as a fixed
                     target on a tactical basemap. -->
                ${te.type === "STATE"
                  ? `<rect x="13" y="13" width="10" height="10" fill="none" stroke="#000" stroke-width="1.5" opacity="0.7"/>`
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
            <div style="color:#94a3b8;margin-bottom:4px">POSITION: <span style="color:#e2e8f0">${te.place}</span></div>
            <div style="color:#f59e0b;font-size:9px;margin-bottom:6px;line-height:1.3">⚑ ${precisionNote(te.precision)} — locality association derived from the reported location, not an observed position</div>
            <div style="color:#94a3b8;margin-bottom:6px">ACTIVITY:</div>
            <div style="color:#e2e8f0;font-size:10px;margin-bottom:6px;line-height:1.4">${te.activity}</div>
            <div style="color:#94a3b8;margin-bottom:3px">CAPABILITIES:</div>
            <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px">
              ${te.capabilities.map(c => `<span style="background:${color}22;border:1px solid ${color}55;color:${color};padding:1px 5px;border-radius:2px;font-size:9px">${c}</span>`).join("")}
            </div>
            ${te.sourceUrl ? `<div style="border-top:1px solid #1e3a5f;padding-top:5px"><a href="${te.sourceUrl}" target="_blank" rel="noopener noreferrer" style="color:#0891b2;font-size:10px;text-decoration:underline">↗ Source: ${te.sourceLabel || "reference"}</a></div>` : ""}
          </div>
        `, {
          className: "tactical-popup",
          maxWidth: 260,
        });

        // Uncertainty ring, sized by how coarse the location resolution is —
        // NOT by threat level. The centre is a gazetteer centroid, so the ring
        // says "somewhere in here", which is the only spatial claim available.
        const aoiCircle = L.circle([te.lat, te.lng], {
          radius: te.precision === "CITY" ? 60000
            : te.precision === "REGION" ? 250000
            : te.precision === "MARITIME" ? 400000
            : 700000,
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

  // ── Global infrastructure / tracking layers: cables, flights, strategic sites ──
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    import("leaflet").then((L) => {
      const map = leafletMapRef.current;
      if (!map) return;
      globalRef.current.forEach((l) => map.removeLayer(l));
      globalRef.current = [];

      // Submarine cables (polylines)
      (cables ?? []).forEach((c) => {
        c.segments.forEach((seg) => {
          if (!seg || seg.length < 2) return;
          const pl = L.polyline(seg, { color: "#a855f7", weight: 1, opacity: 0.4 });
          pl.bindTooltip(`⌁ ${c.name}`, { sticky: true, className: "tactical-tooltip" });
          pl.addTo(map);
          globalRef.current.push(pl);
        });
      });

      // Live flights (ADS-B)
      (flights ?? []).forEach((f) => {
        const fc = f.category === "MILITARY" ? "#ef4444" : f.category === "NONCOMMERCIAL" ? "#cbd5e1" : "#7dd3fc";
        const icon = L.divIcon({
          className: "",
          html: `<div style="transform:rotate(${f.heading ?? 0}deg);color:${fc};font-size:13px;line-height:1;text-shadow:0 0 4px ${fc}">▲</div>`,
          iconSize: [13, 13],
          iconAnchor: [6, 6],
        });
        const route = f.origin || f.dest
          ? `<div style="color:#94a3b8;margin-top:3px">ROUTE: <span style="color:#e2e8f0">${f.origin ?? "?"}${f.originName ? ` (${f.originName})` : ""} → ${f.dest ?? "?"}${f.destName ? ` (${f.destName})` : ""}</span></div>`
          : "";
        const m = L.marker([f.lat, f.lng], { icon });
        m.bindPopup(`
          <div style="background:#0a0e1a;border:1px solid ${fc};color:#e2e8f0;font-family:monospace;font-size:11px;padding:8px;border-radius:4px;min-width:180px">
            <div style="color:${fc};font-weight:bold;margin-bottom:4px">✈ ${f.callsign} <span style="font-size:9px;border:1px solid ${fc};border-radius:2px;padding:0 3px">${f.category ?? "—"}</span></div>
            <div style="color:#94a3b8">ID: <span style="color:#e2e8f0">${f.id}</span></div>
            <div style="color:#94a3b8">ALT: <span style="color:#e2e8f0">${f.altitude != null ? Math.round(f.altitude).toLocaleString() + " ft" : "—"}</span> · HDG: <span style="color:#e2e8f0">${f.heading != null ? Math.round(f.heading) + "°" : "—"}</span></div>
            ${route}
          </div>`, { className: "tactical-popup", maxWidth: 240 });
        m.addTo(map);
        globalRef.current.push(m);
      });

      // Strategic sites & maritime chokepoints
      (sites ?? []).forEach((s) => {
        const meta = SITE_META[s.category as keyof typeof SITE_META] ?? { color: "#94a3b8", symbol: "◆", label: s.category };
        const icon = L.divIcon({
          className: "",
          html: `<div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:3px;background:${meta.color}22;border:1px solid ${meta.color};color:${meta.color};font-size:12px;box-shadow:0 0 6px ${meta.color}66">${meta.symbol}</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        const m = L.marker([s.lat, s.lng], { icon });
        m.bindPopup(`
          <div style="background:#0a0e1a;border:1px solid ${meta.color};color:#e2e8f0;font-family:monospace;font-size:11px;padding:9px;border-radius:4px;min-width:200px">
            <div style="color:${meta.color};font-weight:bold;margin-bottom:4px">${meta.symbol} ${s.name}</div>
            <div style="color:#94a3b8;margin-bottom:4px">${meta.label}</div>
            <div style="color:#e2e8f0;font-size:10px;line-height:1.4;margin-bottom:6px">${s.note}</div>
            <div style="border-top:1px solid #1e3a5f;padding-top:5px"><a href="https://www.google.com/maps?q=${s.lat},${s.lng}" target="_blank" rel="noopener noreferrer" style="color:#0891b2;font-size:10px;text-decoration:underline">↗ Open in Google Maps</a></div>
          </div>`, { className: "tactical-popup", maxWidth: 240 });
        m.addTo(map);
        globalRef.current.push(m);
      });

      // AIS vessels at sea
      (ships ?? []).forEach((v) => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="color:#2dd4bf;font-size:12px;line-height:1;text-shadow:0 0 4px #14b8a6">⬢</div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        const m = L.marker([v.lat, v.lng], { icon });
        m.bindPopup(`
          <div style="background:#0a0e1a;border:1px solid #2dd4bf;color:#e2e8f0;font-family:monospace;font-size:11px;padding:8px;border-radius:4px;min-width:180px">
            <div style="color:#2dd4bf;font-weight:bold;margin-bottom:4px">⛴ ${v.name || "VESSEL"}</div>
            <div style="color:#94a3b8">MMSI: <span style="color:#e2e8f0">${v.mmsi}</span></div>
            <div style="color:#94a3b8">TYPE: <span style="color:#e2e8f0">${v.type || "—"}</span></div>
            <div style="color:#94a3b8">SOG: <span style="color:#e2e8f0">${v.sog != null ? v.sog.toFixed(1) + " kn" : "—"}</span> · COG: <span style="color:#e2e8f0">${v.cog != null ? Math.round(v.cog) + "°" : "—"}</span></div>
            <div style="border-top:1px solid #1e3a5f;margin-top:5px;padding-top:5px"><a href="https://www.google.com/maps?q=${v.lat},${v.lng}" target="_blank" rel="noopener noreferrer" style="color:#0891b2;font-size:10px;text-decoration:underline">↗ Google Maps</a></div>
          </div>`, { className: "tactical-popup", maxWidth: 220 });
        m.addTo(map);
        globalRef.current.push(m);
      });
    });
  }, [cables, flights, sites, ships, mapReady]);

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
          <span>{scopeLabel ? "🌐" : gcc.flag}</span>
          <span>{scopeLabel ?? gcc.abbr}</span>
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
