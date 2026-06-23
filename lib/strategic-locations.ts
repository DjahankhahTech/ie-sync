// Per-CCMD strategic / information-relevant locations and global maritime
// chokepoints, aligned to current US posture and policy (NDS 2022 — PRC pacing
// challenge / Russia acute threat; EDCA expansion 2023; AUKUS; DoD Arctic
// Strategy; submarine-cable security). Coordinates are real (public).
// Reference data for the IE Overlay map layers — not live intelligence.

import type { GCCId } from "./gcc-config";

export type SiteCategory = "C2" | "BASE" | "PARTNER" | "CHOKEPOINT" | "CABLE_LANDING" | "SPACE" | "LOGISTICS" | "INSTALLATION" | "AIRPORT" | "SEAPORT" | "POWER_PLANT" | "SPACEPORT" | "FOREIGN_MIL";

export interface StrategicSite {
  name: string;
  lat: number;
  lng: number;
  category: SiteCategory;
  note: string; // policy / significance basis
}

export const SITE_META: Record<SiteCategory, { color: string; label: string; symbol: string }> = {
  C2:            { color: "#00d4ff", label: "C2 / HQ", symbol: "★" },
  BASE:          { color: "#10b981", label: "Base / Posture", symbol: "▣" },
  PARTNER:       { color: "#22d3ee", label: "Partner / Access", symbol: "⬢" },
  CHOKEPOINT:    { color: "#f59e0b", label: "Maritime Chokepoint", symbol: "⚓" },
  CABLE_LANDING: { color: "#a855f7", label: "Cable Landing Hub", symbol: "⌁" },
  SPACE:         { color: "#e879f9", label: "Space / Early Warning", symbol: "✦" },
  LOGISTICS:     { color: "#94a3b8", label: "Logistics / Sustainment", symbol: "⬓" },
  INSTALLATION:  { color: "#34d399", label: "Military Installation", symbol: "▦" },
  AIRPORT:       { color: "#60a5fa", label: "Major Airport", symbol: "✈" },
  SEAPORT:       { color: "#2dd4bf", label: "Major Seaport", symbol: "⛴" },
  POWER_PLANT:   { color: "#fbbf24", label: "Major Power Plant", symbol: "⚡" },
  SPACEPORT:     { color: "#f472b6", label: "Spaceport / Launch Site", symbol: "🚀" },
  FOREIGN_MIL:   { color: "#fb7185", label: "Foreign Military Installation", symbol: "◭" },
};

// Major FOREIGN (non-US) military installations across all nations — the
// adversary/competitor side of the posture picture (PRC, Russia, Iran, DPRK,
// and host-nation forces). Real, public coordinates. Reference data, not live
// intelligence. Appended to each AOR's strategic sites.
const FOREIGN: Record<GCCId, StrategicSite[]> = {
  INDOPACOM: [
    { name: "Yulin Naval Base — Hainan, PRC", lat: 18.23, lng: 109.69, category: "FOREIGN_MIL", note: "PLAN SSBN/attack-submarine base; South China Sea power projection." },
    { name: "PLA Eastern Theater Command HQ — Nanjing", lat: 32.06, lng: 118.78, category: "FOREIGN_MIL", note: "PLA theater command oriented on Taiwan / East China Sea." },
    { name: "PLA Southern Theater Command HQ — Guangzhou", lat: 23.13, lng: 113.27, category: "FOREIGN_MIL", note: "PLA theater command oriented on the South China Sea." },
    { name: "Fiery Cross Reef — Spratlys (PRC outpost)", lat: 9.55, lng: 112.89, category: "FOREIGN_MIL", note: "Militarized artificial island; runway, radar & missile facilities." },
    { name: "Subi Reef — Spratlys (PRC outpost)", lat: 10.92, lng: 114.07, category: "FOREIGN_MIL", note: "Militarized artificial island; airstrip & sensors." },
    { name: "Mischief Reef — Spratlys (PRC outpost)", lat: 9.90, lng: 115.53, category: "FOREIGN_MIL", note: "Militarized artificial island in the Philippine EEZ." },
    { name: "Woody Island (Yongxing) — Paracels, PRC", lat: 16.83, lng: 112.34, category: "FOREIGN_MIL", note: "PRC Paracels administrative/military hub; HQ-9 SAMs deployed." },
    { name: "Ream Naval Base — Cambodia (PRC access)", lat: 10.50, lng: 103.61, category: "FOREIGN_MIL", note: "PRC-funded expansion; suspected PLAN access in Gulf of Thailand." },
    { name: "Sinpo Naval Shipyard — DPRK", lat: 40.04, lng: 128.18, category: "FOREIGN_MIL", note: "DPRK SLBM submarine development & test base." },
    { name: "Russian Pacific Fleet HQ — Vladivostok", lat: 43.10, lng: 131.87, category: "FOREIGN_MIL", note: "Russia's primary Pacific naval base." },
  ],
  CENTCOM: [
    { name: "Bandar Abbas Naval Base — Iran", lat: 27.15, lng: 56.21, category: "FOREIGN_MIL", note: "IRIN/IRGCN main base controlling the Strait of Hormuz." },
    { name: "Chabahar Naval Base — Iran", lat: 25.29, lng: 60.62, category: "FOREIGN_MIL", note: "Iran's Gulf of Oman naval base outside the Strait." },
    { name: "Hmeimim Air Base — Syria (Russia)", lat: 35.40, lng: 35.95, category: "FOREIGN_MIL", note: "Russia's main Levant air base; expeditionary hub to Africa." },
    { name: "Tartus Naval Base — Syria (Russia)", lat: 34.90, lng: 35.88, category: "FOREIGN_MIL", note: "Russia's only Mediterranean naval facility." },
  ],
  EUCOM: [
    { name: "Baltiysk Naval Base — Kaliningrad (Russia)", lat: 54.65, lng: 19.91, category: "FOREIGN_MIL", note: "Russian Baltic Fleet HQ; A2/AD bastion on NATO's flank." },
    { name: "Severomorsk — Northern Fleet HQ (Russia)", lat: 69.07, lng: 33.42, category: "FOREIGN_MIL", note: "Russia's strategic-submarine bastion; Arctic GIUK approaches." },
    { name: "Sevastopol Naval Base — Crimea (Russia)", lat: 44.62, lng: 33.53, category: "FOREIGN_MIL", note: "Black Sea Fleet HQ (occupied Crimea); contested in Ukraine war." },
    { name: "Osipovichi area — Belarus (Russian forces)", lat: 53.30, lng: 28.64, category: "FOREIGN_MIL", note: "Reported Russian non-strategic nuclear storage / basing in Belarus." },
  ],
  AFRICOM: [
    { name: "PLA Support Base — Djibouti", lat: 11.59, lng: 43.06, category: "FOREIGN_MIL", note: "China's first overseas military base; adjacent to US Camp Lemonnier." },
    { name: "Wagner / Africa Corps hub — Bangui, CAR", lat: 4.39, lng: 18.56, category: "FOREIGN_MIL", note: "Russian PMC basing & influence node in Central Africa." },
    { name: "Russian deployment hub — Bamako, Mali", lat: 12.64, lng: -8.00, category: "FOREIGN_MIL", note: "Africa Corps presence following French/UN withdrawal." },
  ],
  SOUTHCOM: [
    { name: "Bejucal SIGINT Station — Cuba", lat: 22.93, lng: -82.39, category: "FOREIGN_MIL", note: "PRC-linked signals-intelligence collection site (CSIS reporting)." },
    { name: "Lourdes SIGINT Complex — Cuba", lat: 23.00, lng: -82.46, category: "FOREIGN_MIL", note: "Cold-War Russian SIGINT site; reported renewed interest." },
    { name: "La Carlota Air Base — Caracas, Venezuela", lat: 10.49, lng: -66.84, category: "FOREIGN_MIL", note: "Venezuelan military airfield; Russia/Cuba security ties." },
  ],
  NORTHCOM: [
    { name: "Russian Arctic activity — Franz Josef approaches", lat: 80.5, lng: 50.0, category: "FOREIGN_MIL", note: "Russian Arctic re-militarization across NORTHCOM's northern approaches." },
  ],
  SPACECOM: [
    { name: "PLA Aerospace Force HQ — Beijing", lat: 39.91, lng: 116.40, category: "FOREIGN_MIL", note: "PRC military space/counterspace force (reorganized from the former SSF, 2024)." },
    { name: "Russian Space Forces — Titov Test Center, Krasnoznamensk", lat: 55.60, lng: 37.05, category: "FOREIGN_MIL", note: "Russian military space command & control / satellite ops." },
    { name: "Xichang Counterspace-relevant Launch — PRC", lat: 28.25, lng: 102.03, category: "FOREIGN_MIL", note: "PRC launches incl. SJ-series co-orbital/inspector satellites." },
  ],
  CYBERCOM: [
    { name: "PLA Information Support Force HQ — Beijing", lat: 39.91, lng: 116.40, category: "FOREIGN_MIL", note: "PRC cyber/network & information-domain force (reorganized 2024)." },
    { name: "GRU HQ — Moscow", lat: 55.79, lng: 37.59, category: "FOREIGN_MIL", note: "Russian military intelligence; APT28 (Fancy Bear) & Sandworm/APT44." },
    { name: "SVR HQ — Yasenevo, Moscow", lat: 55.58, lng: 37.51, category: "FOREIGN_MIL", note: "Russian foreign-intelligence service; APT29 (Cozy Bear)." },
    { name: "DPRK RGB / Bureau 121 — Pyongyang", lat: 39.04, lng: 125.76, category: "FOREIGN_MIL", note: "North Korean cyber command; Lazarus Group operations." },
    { name: "IRGC Cyber — Tehran", lat: 35.69, lng: 51.39, category: "FOREIGN_MIL", note: "IRGC-linked cyber/influence operations (Magic Hound / Charming Kitten)." },
  ],
};

// Major spaceports / orbital launch sites per CCMD (real coordinates). Space is
// an OIE-relevant domain — launch sites are strategic C4ISR / counterspace and
// information-infrastructure nodes. Appended to each AOR's strategic sites.
const SPACEPORTS: Record<GCCId, StrategicSite[]> = {
  INDOPACOM: [
    { name: "Jiuquan Satellite Launch Center — PRC", lat: 40.96, lng: 100.29, category: "SPACEPORT", note: "PLA crewed/military launch complex; counterspace & ISR launches." },
    { name: "Wenchang Space Launch Site — PRC (Hainan)", lat: 19.61, lng: 110.95, category: "SPACEPORT", note: "PRC heavy-lift (Long March 5) coastal launch site." },
    { name: "Tanegashima Space Center — Japan", lat: 30.40, lng: 130.97, category: "SPACEPORT", note: "Japan's primary launch site (JAXA)." },
    { name: "Satish Dhawan SC (Sriharikota) — India", lat: 13.72, lng: 80.23, category: "SPACEPORT", note: "ISRO's primary orbital launch range." },
  ],
  CENTCOM: [
    { name: "Baikonur Cosmodrome — Kazakhstan", lat: 45.96, lng: 63.31, category: "SPACEPORT", note: "World's first/largest spaceport; Russia-leased crewed launch hub." },
    { name: "Imam Khomeini Spaceport (Semnan) — Iran", lat: 35.23, lng: 53.92, category: "SPACEPORT", note: "Iran's space-launch & SLV development site; dual-use concern." },
  ],
  EUCOM: [
    { name: "Plesetsk Cosmodrome — Russia", lat: 62.93, lng: 40.57, category: "SPACEPORT", note: "Russia's primary military launch site (Mil/ISR/early-warning)." },
    { name: "Andøya Spaceport — Norway", lat: 69.29, lng: 16.02, category: "SPACEPORT", note: "First operational orbital launch site in continental Europe." },
    { name: "SaxaVord Spaceport — UK (Shetland)", lat: 60.82, lng: -0.90, category: "SPACEPORT", note: "UK vertical-launch spaceport; allied space access." },
    { name: "Esrange Space Center — Sweden", lat: 67.89, lng: 21.10, category: "SPACEPORT", note: "European orbital/sub-orbital launch & test range." },
  ],
  AFRICOM: [
    { name: "Luigi Broglio Space Center (San Marco) — Kenya", lat: -2.94, lng: 40.21, category: "SPACEPORT", note: "Italian-operated equatorial launch range off Malindi." },
  ],
  SOUTHCOM: [
    { name: "Alcântara Launch Center — Brazil", lat: -2.37, lng: -44.40, category: "SPACEPORT", note: "Near-equatorial spaceport; US-Brazil Technology Safeguards Agreement." },
  ],
  NORTHCOM: [
    { name: "Cape Canaveral SFS / Kennedy SC — FL", lat: 28.49, lng: -80.57, category: "SPACEPORT", note: "Eastern Range; primary US crewed & national-security launch complex." },
    { name: "Vandenberg SFB — CA", lat: 34.74, lng: -120.57, category: "SPACEPORT", note: "Western Range; polar-orbit & national-security launches." },
    { name: "Wallops Flight Facility — VA", lat: 37.94, lng: -75.46, category: "SPACEPORT", note: "NASA/Mid-Atlantic Regional Spaceport." },
    { name: "Pacific Spaceport Complex — Kodiak, AK", lat: 57.44, lng: -152.34, category: "SPACEPORT", note: "Alaska high-inclination/polar orbital launch site." },
  ],
  SPACECOM: [
    { name: "Cape Canaveral SFS / Kennedy SC — FL", lat: 28.49, lng: -80.57, category: "SPACEPORT", note: "Eastern Range; primary US national-security & crewed launch complex." },
    { name: "Vandenberg SFB — CA", lat: 34.74, lng: -120.57, category: "SPACEPORT", note: "Western Range; polar-orbit & national-security launches." },
    { name: "Jiuquan Satellite Launch Center — PRC", lat: 40.96, lng: 100.29, category: "SPACEPORT", note: "PLA crewed/military launch complex." },
    { name: "Xichang Satellite Launch Center — PRC", lat: 28.25, lng: 102.03, category: "SPACEPORT", note: "PRC GEO & counterspace-relevant launches." },
    { name: "Plesetsk Cosmodrome — Russia", lat: 62.93, lng: 40.57, category: "SPACEPORT", note: "Russia's primary military launch site." },
    { name: "Baikonur Cosmodrome — Kazakhstan", lat: 45.96, lng: 63.31, category: "SPACEPORT", note: "Russia-leased heavy/crewed launch hub." },
  ],
  CYBERCOM: [],
};

// Major infrastructure per CCMD — representative set of key military
// installations, major airports, major seaports, and major power plants
// (real coordinates). Appended to each AOR's strategic sites.
const INFRA: Record<GCCId, StrategicSite[]> = {
  INDOPACOM: [
    { name: "Yokosuka Naval Base — Japan", lat: 35.29, lng: 139.67, category: "INSTALLATION", note: "US 7th Fleet homeport; forward naval C2." },
    { name: "Osan Air Base — ROK", lat: 37.09, lng: 127.03, category: "INSTALLATION", note: "7th Air Force; Korean peninsula air ops." },
    { name: "Tokyo Haneda Intl", lat: 35.55, lng: 139.78, category: "AIRPORT", note: "Major regional hub." },
    { name: "Singapore Changi Intl", lat: 1.36, lng: 103.99, category: "AIRPORT", note: "Strategic SE-Asia air hub." },
    { name: "Port of Singapore", lat: 1.26, lng: 103.84, category: "SEAPORT", note: "World's 2nd-busiest container port; Malacca-adjacent." },
    { name: "Port of Shanghai", lat: 31.34, lng: 121.65, category: "SEAPORT", note: "World's busiest container port (PRC)." },
    { name: "Three Gorges Dam — PRC", lat: 30.82, lng: 111.0, category: "POWER_PLANT", note: "World's largest hydroelectric plant (~22.5 GW)." },
    { name: "Kashiwazaki-Kariwa NPP — Japan", lat: 37.43, lng: 138.6, category: "POWER_PLANT", note: "One of the world's largest nuclear plants." },
  ],
  CENTCOM: [
    { name: "Prince Sultan Air Base — Saudi Arabia", lat: 24.06, lng: 47.58, category: "INSTALLATION", note: "Forward air operations; regional deterrence." },
    { name: "Dubai Intl (DXB)", lat: 25.25, lng: 55.36, category: "AIRPORT", note: "Major global aviation hub." },
    { name: "Jebel Ali Port — UAE", lat: 25.01, lng: 55.06, category: "SEAPORT", note: "Largest man-made harbor; key US Navy port call." },
    { name: "Port of Jeddah — Saudi Arabia", lat: 21.46, lng: 39.16, category: "SEAPORT", note: "Red Sea commercial gateway." },
    { name: "Barakah NPP — UAE", lat: 23.97, lng: 52.2, category: "POWER_PLANT", note: "Arab world's first nuclear plant (~5.6 GW)." },
    { name: "Bushehr NPP — Iran", lat: 28.83, lng: 50.89, category: "POWER_PLANT", note: "Iran's first nuclear power plant." },
  ],
  EUCOM: [
    { name: "Aviano Air Base — Italy", lat: 46.03, lng: 12.6, category: "INSTALLATION", note: "31st Fighter Wing; southern-flank air ops." },
    { name: "Frankfurt Airport (FRA)", lat: 50.04, lng: 8.56, category: "AIRPORT", note: "Major European hub; logistics gateway." },
    { name: "Istanbul Airport (IST)", lat: 41.26, lng: 28.74, category: "AIRPORT", note: "Bosphorus-adjacent major hub." },
    { name: "Port of Rotterdam — Netherlands", lat: 51.95, lng: 4.14, category: "SEAPORT", note: "Europe's largest seaport." },
    { name: "Port of Hamburg — Germany", lat: 53.54, lng: 9.97, category: "SEAPORT", note: "Major North-Sea container port." },
    { name: "Zaporizhzhia NPP — Ukraine", lat: 47.51, lng: 34.59, category: "POWER_PLANT", note: "Europe's largest nuclear plant; active conflict-zone risk." },
  ],
  AFRICOM: [
    { name: "Cairo Intl (CAI)", lat: 30.11, lng: 31.41, category: "AIRPORT", note: "Major North-Africa hub." },
    { name: "OR Tambo Intl — Johannesburg", lat: -26.13, lng: 28.24, category: "AIRPORT", note: "Busiest airport in Africa." },
    { name: "Port of Mombasa — Kenya", lat: -4.04, lng: 39.66, category: "SEAPORT", note: "East-Africa gateway port." },
    { name: "Port of Djibouti", lat: 11.6, lng: 43.14, category: "SEAPORT", note: "Bab-el-Mandeb logistics hub; PRC/US base adjacency." },
    { name: "Grand Ethiopian Renaissance Dam", lat: 11.21, lng: 35.09, category: "POWER_PLANT", note: "Africa's largest hydro plant; Nile-water flashpoint." },
    { name: "Aswan High Dam — Egypt", lat: 23.97, lng: 32.88, category: "POWER_PLANT", note: "Strategic Nile hydroelectric plant." },
  ],
  SOUTHCOM: [
    { name: "El Dorado Intl — Bogotá", lat: 4.7, lng: -74.15, category: "AIRPORT", note: "Major Andean air hub." },
    { name: "Guarulhos Intl — São Paulo", lat: -23.43, lng: -46.47, category: "AIRPORT", note: "Busiest airport in South America." },
    { name: "Port of Santos — Brazil", lat: -23.95, lng: -46.31, category: "SEAPORT", note: "Largest port in Latin America." },
    { name: "Port of Cartagena — Colombia", lat: 10.4, lng: -75.5, category: "SEAPORT", note: "Caribbean transshipment hub; Panama-adjacent." },
    { name: "Itaipu Dam — Brazil/Paraguay", lat: -25.41, lng: -54.59, category: "POWER_PLANT", note: "One of world's largest hydro plants (~14 GW)." },
  ],
  NORTHCOM: [
    { name: "Naval Station Norfolk — VA", lat: 36.95, lng: -76.33, category: "INSTALLATION", note: "World's largest naval base; Atlantic Fleet." },
    { name: "Hartsfield-Jackson Atlanta (ATL)", lat: 33.64, lng: -84.43, category: "AIRPORT", note: "World's busiest airport." },
    { name: "Ports of LA / Long Beach", lat: 33.73, lng: -118.26, category: "SEAPORT", note: "Largest US container port complex." },
    { name: "Palo Verde NPP — AZ", lat: 33.39, lng: -112.86, category: "POWER_PLANT", note: "Largest US nuclear plant by output." },
    { name: "Grand Coulee Dam — WA", lat: 47.96, lng: -118.98, category: "POWER_PLANT", note: "Largest US hydroelectric facility." },
  ],
  SPACECOM: [
    { name: "RAF Menwith Hill — UK", lat: 54.01, lng: -1.69, category: "INSTALLATION", note: "Major SIGINT & space-ground relay station (US/UK)." },
    { name: "Pine Gap Joint Defence Facility — Australia", lat: -23.80, lng: 133.74, category: "INSTALLATION", note: "Joint US-Australia satellite ground station; missile-warning & SIGINT." },
  ],
  CYBERCOM: [
    { name: "Ashburn 'Data Center Alley' — VA", lat: 39.04, lng: -77.49, category: "INSTALLATION", note: "World's densest data-center hub; a large share of global internet traffic transits here." },
    { name: "NSA Utah Data Center — Bluffdale, UT", lat: 40.43, lng: -111.93, category: "INSTALLATION", note: "Intelligence-community data/analytics facility." },
  ],
};

// Global maritime chokepoints — the "shipping" strategic layer. (Live per-vessel
// AIS requires a keyed feed; these are the policy-relevant strategic narrows.)
export const MARITIME_CHOKEPOINTS: StrategicSite[] = [
  { name: "Strait of Malacca", lat: 1.43, lng: 102.89, category: "CHOKEPOINT", note: "~30% of global trade; PRC 'Malacca dilemma' — primary INDOPACOM SLOC." },
  { name: "Taiwan Strait", lat: 24.5, lng: 119.5, category: "CHOKEPOINT", note: "NDS pacing-challenge flashpoint; ~20% of global container traffic transits." },
  { name: "Luzon Strait / Bashi Channel", lat: 20.5, lng: 121.5, category: "CHOKEPOINT", note: "PLA-Navy Pacific breakout route; key ASW/EW choke." },
  { name: "Strait of Hormuz", lat: 26.57, lng: 56.25, category: "CHOKEPOINT", note: "~20% of global oil; CENTCOM Iran deterrence focus." },
  { name: "Bab-el-Mandeb", lat: 12.58, lng: 43.33, category: "CHOKEPOINT", note: "Red Sea SLOC; Houthi threat to shipping." },
  { name: "Suez Canal", lat: 30.42, lng: 32.35, category: "CHOKEPOINT", note: "Europe–Asia SLOC; closure reroutes via Cape of Good Hope." },
  { name: "Bosphorus Strait", lat: 41.12, lng: 29.07, category: "CHOKEPOINT", note: "Black Sea access; Montreux Convention; Russia/Ukraine relevance." },
  { name: "Strait of Gibraltar", lat: 35.97, lng: -5.5, category: "CHOKEPOINT", note: "Mediterranean–Atlantic gateway." },
  { name: "Panama Canal", lat: 9.08, lng: -79.68, category: "CHOKEPOINT", note: "Inter-ocean SLOC; PRC port-investment concern (SOUTHCOM)." },
  { name: "Danish Straits", lat: 55.7, lng: 11.0, category: "CHOKEPOINT", note: "Baltic access; NATO 'Baltic lake' post-Finland/Sweden accession." },
];

const SITES: Record<GCCId, StrategicSite[]> = {
  INDOPACOM: [
    { name: "USINDOPACOM HQ — Camp H.M. Smith, HI", lat: 21.39, lng: -157.91, category: "C2", note: "Combatant command HQ; priority theater under NDS 2022." },
    { name: "Joint Region Marianas — Guam (Andersen/NB Guam)", lat: 13.58, lng: 144.92, category: "BASE", note: "Power-projection hub; missile-defense buildup; 2nd island chain anchor." },
    { name: "Kadena AB — Okinawa", lat: 26.36, lng: 127.77, category: "BASE", note: "Keystone of 1st island chain; PLA-RF missile-range concern." },
    { name: "EDCA Site — Basa Air Base, Philippines", lat: 15.05, lng: 120.5, category: "PARTNER", note: "2023 EDCA expansion (9 sites); South China Sea access." },
    { name: "MRF-Darwin — Australia", lat: -12.46, lng: 130.84, category: "PARTNER", note: "Force-posture initiative; AUKUS submarine/basing cooperation." },
    { name: "Diego Garcia — BIOT", lat: -7.31, lng: 72.41, category: "BASE", note: "Indian Ocean strategic bomber/logistics hub." },
    { name: "Singapore / Hong Kong cable hub", lat: 1.29, lng: 103.85, category: "CABLE_LANDING", note: "Major submarine-cable landing concentration; PRC routing concern." },
  ],
  CENTCOM: [
    { name: "Al Udeid Air Base — Qatar", lat: 25.12, lng: 51.32, category: "C2", note: "CENTCOM forward HQ / CAOC; theater air C2." },
    { name: "NSA Bahrain — US 5th Fleet", lat: 26.21, lng: 50.61, category: "BASE", note: "Naval C2 for Hormuz / Gulf maritime security." },
    { name: "Camp Arifjan — Kuwait", lat: 28.88, lng: 48.16, category: "LOGISTICS", note: "Primary Army sustainment hub in the AOR." },
    { name: "Erbil — Iraq (partner)", lat: 36.19, lng: 44.01, category: "PARTNER", note: "Counter-ISIS / partner access node." },
    { name: "Strait of Hormuz", lat: 26.57, lng: 56.25, category: "CHOKEPOINT", note: "Iran deterrence; ~20% of global oil transits." },
    { name: "Bab-el-Mandeb", lat: 12.58, lng: 43.33, category: "CHOKEPOINT", note: "Houthi maritime threat; Red Sea SLOC." },
  ],
  EUCOM: [
    { name: "USEUCOM HQ — Patch Barracks, Stuttgart", lat: 48.74, lng: 9.1, category: "C2", note: "Combatant command HQ; Russia acute-threat focus." },
    { name: "Ramstein AB — Germany", lat: 49.44, lng: 7.6, category: "BASE", note: "Theater airlift / air C2; Ukraine-support logistics." },
    { name: "Naval Station Rota — Spain", lat: 36.62, lng: -6.35, category: "BASE", note: "Forward-deployed DDGs; Atlantic/Med access." },
    { name: "Suwałki Gap — Poland/Lithuania", lat: 54.1, lng: 23.0, category: "CHOKEPOINT", note: "NATO land choke between Kaliningrad and Belarus." },
    { name: "Bosphorus Strait — Türkiye", lat: 41.12, lng: 29.07, category: "CHOKEPOINT", note: "Black Sea access; Montreux Convention." },
    { name: "Marseille cable hub — France", lat: 43.3, lng: 5.37, category: "CABLE_LANDING", note: "Top Mediterranean submarine-cable landing; protection priority." },
  ],
  AFRICOM: [
    { name: "USAFRICOM HQ — Kelley Barracks, Stuttgart", lat: 48.73, lng: 9.18, category: "C2", note: "Combatant command HQ (located in Germany)." },
    { name: "Camp Lemonnier — Djibouti", lat: 11.55, lng: 43.16, category: "BASE", note: "Only enduring US base in Africa; adjacent to PRC's first overseas base." },
    { name: "Bab-el-Mandeb", lat: 12.58, lng: 43.33, category: "CHOKEPOINT", note: "Red Sea / Gulf of Aden SLOC chokepoint." },
    { name: "Lagos cable landing — Nigeria", lat: 6.43, lng: 3.42, category: "CABLE_LANDING", note: "Major West-Africa submarine-cable terminus." },
    { name: "Sahel influence belt", lat: 15.0, lng: 0.0, category: "PARTNER", note: "Russia/Wagner influence competition (African Initiative)." },
  ],
  SOUTHCOM: [
    { name: "USSOUTHCOM HQ — Doral, FL", lat: 25.82, lng: -80.34, category: "C2", note: "Combatant command HQ." },
    { name: "Panama Canal", lat: 9.08, lng: -79.68, category: "CHOKEPOINT", note: "Inter-ocean SLOC; PRC port-investment concern." },
    { name: "Soto Cano AB — Honduras", lat: 14.38, lng: -87.62, category: "BASE", note: "JTF-Bravo; regional access / HADR hub." },
    { name: "NSGB — Guantanamo Bay, Cuba", lat: 19.9, lng: -75.21, category: "BASE", note: "Caribbean maritime access node." },
    { name: "Fortaleza cable hub — Brazil", lat: -3.73, lng: -38.52, category: "CABLE_LANDING", note: "Primary South-Atlantic submarine-cable landing." },
  ],
  NORTHCOM: [
    { name: "USNORTHCOM/NORAD HQ — Peterson SFB, CO", lat: 38.82, lng: -104.7, category: "C2", note: "Homeland defense / aerospace warning C2." },
    { name: "Pituffik Space Base (Thule) — Greenland", lat: 76.53, lng: -68.7, category: "SPACE", note: "BMEWS missile warning; Arctic approaches (DoD Arctic Strategy)." },
    { name: "Clear / Beale early-warning radars", lat: 39.13, lng: -121.44, category: "SPACE", note: "Upgraded early-warning radar; homeland missile defense." },
    { name: "Virginia Beach cable landing", lat: 36.84, lng: -75.97, category: "CABLE_LANDING", note: "Major transatlantic cable terminus; CISA protection priority." },
    { name: "Arctic northern approaches", lat: 71.0, lng: -156.5, category: "CHOKEPOINT", note: "Opening Arctic SLOCs; Russia/PRC near-Arctic activity." },
  ],
  SPACECOM: [
    { name: "USSPACECOM HQ — Peterson SFB, CO", lat: 38.82, lng: -104.70, category: "C2", note: "Combatant command HQ for the space domain." },
    { name: "Schriever SFB — CO", lat: 38.83, lng: -104.53, category: "BASE", note: "Space operations; GSSAP space-domain-awareness satellites; Combined Space Ops." },
    { name: "Buckley SFB — CO", lat: 39.70, lng: -104.75, category: "SPACE", note: "SBIRS/missile-warning ground station; space surveillance." },
    { name: "Pituffik Space Base (Thule) — Greenland", lat: 76.53, lng: -68.70, category: "SPACE", note: "BMEWS missile warning & space surveillance; Arctic approaches." },
    { name: "Kaena Point SFS — Hawaii", lat: 21.57, lng: -158.27, category: "SPACE", note: "Space Surveillance Network optical/radar tracking site." },
    { name: "Diego Garcia GEODSS — BIOT", lat: -7.41, lng: 72.45, category: "SPACE", note: "Ground-based electro-optical deep-space surveillance site." },
  ],
  CYBERCOM: [
    { name: "USCYBERCOM / NSA HQ — Fort Meade, MD", lat: 39.11, lng: -76.77, category: "C2", note: "Combatant command HQ for cyberspace; co-located with NSA." },
    { name: "Army Cyber (ARCYBER) — Fort Eisenhower, GA", lat: 33.42, lng: -82.13, category: "BASE", note: "Army cyber component & Cyber Center of Excellence." },
    { name: "16th Air Force (AFCYBER) — JBSA-Lackland, TX", lat: 29.38, lng: -98.62, category: "BASE", note: "Air Force cyber/IO & ISR component command." },
    { name: "Fleet Cyber / 10th Fleet — Fort Meade, MD", lat: 39.10, lng: -76.74, category: "BASE", note: "Navy cyber component command." },
  ],
};

export function getStrategicSites(gcc: GCCId): StrategicSite[] {
  return [...(SITES[gcc] ?? SITES.INDOPACOM), ...(INFRA[gcc] ?? INFRA.INDOPACOM), ...(SPACEPORTS[gcc] ?? []), ...(FOREIGN[gcc] ?? [])];
}

// All CCMDs' strategic sites merged (for the global "ALL CCMDs" map view),
// de-duplicated by name.
export function getAllStrategicSites(): StrategicSite[] {
  const seen = new Set<string>();
  const out: StrategicSite[] = [];
  (Object.keys(SITES) as GCCId[]).forEach((g) => {
    getStrategicSites(g).forEach((s) => {
      if (seen.has(s.name)) return;
      seen.add(s.name);
      out.push(s);
    });
  });
  return out;
}
