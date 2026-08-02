// Historical / reference threat-entity library — REAL, publicly-attributed actors
// per combatant command, used on the IE Overlay when no live AI assessment has
// populated the store yet. Reference data, not live intelligence — the overlay
// labels these HISTORICAL / REFERENCE.
//
// SOURCES VERIFIED 2026-06-18: MITRE ATT&CK group IDs confirmed against the live
// pages (G0096 APT41, G0007 APT28, G0059 Magic Hound/Charming Kitten); CISA,
// DOJ, US State Dept GEC, IISS, Mandiant, and RAND links checked. Every
// sourceUrl points to a real, topically-correct authoritative page.
//
// Each entity is tagged to one of the three OIE information layers:
//   PHYSICAL      — tangible: platforms, emitters, installations, basing, geography
//   TECHNICAL     — networks, cyber, SIGINT, the information systems layer
//   INFORMATIONAL — content, narratives, media, influence operations

import type { GCCId } from "./gcc-config";
import type { ThreatEntity, NarrativeThread } from "./mock-data";

export type IELayer = "PHYSICAL" | "TECHNICAL" | "INFORMATIONAL" | "UNKNOWN";
export type LibraryThreat = ThreatEntity & { layer: IELayer };

// Classify any threat entity (live assessment entities have no explicit layer).
export function layerOf(e: ThreatEntity & { layer?: IELayer }): IELayer {
  if (e.layer) return e.layer;
  const caps = e.capabilities.map((c) => c.toUpperCase());
  const loc = (e.location || "").toLowerCase();
  const physicalLoc = !/(cyber|network|telecom|global|online|social|platform)/.test(loc);
  if (caps.some((c) => ["MISO", "SOCMINT", "PSYOP", "DECEPTION", "PA", "INFLUENCE"].includes(c)) && !caps.includes("CYBER")) return "INFORMATIONAL";
  if (caps.some((c) => ["CYBER", "SIGINT", "ELINT"].includes(c))) return physicalLoc && caps.includes("EW") ? "PHYSICAL" : "TECHNICAL";
  if (caps.includes("EW")) return "PHYSICAL";
  // Fall through to UNKNOWN rather than guessing. This matches on exact
  // capability strings, and live AI entities phrase them freely ("INFLUENCE
  // OPS" vs "INFLUENCE", "PSYWAR" vs "PSYOP"), so an unrecognised set is
  // common. Defaulting to PHYSICAL asserted the one layer that implies a
  // real-world position.
  return "UNKNOWN";
}

const D = "2025-12-01T00:00Z"; // reference "last seen" — historical, not live

// ── Verified source URLs (checked 2026-06-18) ──────────────────────────────
const SRC = {
  MITRE_APT41: { url: "https://attack.mitre.org/groups/G0096/", label: "MITRE ATT&CK G0096" },
  MITRE_APT28: { url: "https://attack.mitre.org/groups/G0007/", label: "MITRE ATT&CK G0007" },
  MITRE_MAGICHOUND: { url: "https://attack.mitre.org/groups/G0059/", label: "MITRE ATT&CK G0059" },
  CISA_VOLT: { url: "https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-038a", label: "CISA AA24-038A" },
  CISA_SALT: { url: "https://www.cisa.gov/resources-tools/resources/enhanced-visibility-and-hardening-guidance-communications-infrastructure", label: "CISA/FBI/NSA Dec 2024" },
  MANDIANT_DRAGONBRIDGE: { url: "https://www.mandiant.com/resources/blog/prc-dragonbridge-influence-elections", label: "Mandiant — DRAGONBRIDGE" },
  MANDIANT_GHOSTWRITER: { url: "https://www.mandiant.com/resources/unc1151-ghostwriter-update-report", label: "Mandiant — UNC1151/Ghostwriter" },
  MANDIANT_TI: { url: "https://cloud.google.com/blog/topics/threat-intelligence/", label: "Mandiant / Google Threat Intel" },
  GEC_CHINA: { url: "https://2021-2025.state.gov/gec-special-report-how-the-peoples-republic-of-china-seeks-to-reshape-the-global-information-environment/", label: "US State Dept GEC 2023" },
  GEC_RUSSIA: { url: "https://2021-2025.state.gov/gec-special-report-russias-pillars-of-disinformation-and-propaganda/", label: "US State Dept GEC" },
  GEC_AFRICA: { url: "https://2021-2025.state.gov/the-kremlins-efforts-to-spread-deadly-disinformation-in-africa/", label: "US State Dept GEC" },
  DOJ_DOPPELGANGER: { url: "https://www.justice.gov/archives/opa/pr/justice-department-disrupts-covert-russian-government-sponsored-foreign-malign-influence", label: "DOJ Sep 2024" },
  IISS_ISF: { url: "https://www.iiss.org/online-analysis/online-analysis/2024/05/chinas-new-information-support-force/", label: "IISS 2024" },
  CSIS_CHINAPOWER: { url: "https://chinapower.csis.org/", label: "CSIS ChinaPower" },
  RAND_EW: { url: "https://www.rand.org/topics/electronic-warfare.html", label: "RAND — Electronic Warfare" },
  WASHINST: { url: "https://www.washingtoninstitute.org/", label: "Washington Institute" },
  AFRICACENTER: { url: "https://africacenter.org/", label: "Africa Center for Strategic Studies" },
  MITRE_LAZARUS: { url: "https://attack.mitre.org/groups/G0032/", label: "MITRE ATT&CK G0032" },
  MITRE_SANDWORM: { url: "https://attack.mitre.org/groups/G0034/", label: "MITRE ATT&CK G0034" },
  MITRE_APT29: { url: "https://attack.mitre.org/groups/G0016/", label: "MITRE ATT&CK G0016" },
  CSIS_SPACE: { url: "https://aerospace.csis.org/space-threat-assessment/", label: "CSIS Space Threat Assessment" },
  SWF_SPACE: { url: "https://swfound.org/counterspace/", label: "Secure World Foundation — Counterspace" },
} as const;

const INDOPACOM: LibraryThreat[] = [
  { id: "H-IP-1", layer: "TECHNICAL", designation: "APT41 / BARIUM (PRC MSS)", type: "STATE", location: "Cyberspace — PRC MSS / Chengdu 404", grid: [76, 36], activity: "Coordinated IO, SIGINT collection, and network intrusion across the Indo-Pacific", threat: "CRITICAL", confidence: 88, reportedAt: D, capabilities: ["CYBER", "SIGINT", "MISO", "DECEPTION"], sourceUrl: SRC.MITRE_APT41.url, sourceLabel: SRC.MITRE_APT41.label },
  { id: "H-IP-2", layer: "TECHNICAL", designation: "VOLT TYPHOON (PRC APT)", type: "STATE", location: "Cyberspace — US/INDOPACOM critical infrastructure", grid: [64, 46], activity: "Pre-positioning in critical infrastructure; living-off-the-land; C2 botnet", threat: "CRITICAL", confidence: 85, reportedAt: D, capabilities: ["CYBER"], sourceUrl: SRC.CISA_VOLT.url, sourceLabel: SRC.CISA_VOLT.label },
  { id: "H-IP-3", layer: "TECHNICAL", designation: "SALT TYPHOON (PRC APT)", type: "STATE", location: "Cyberspace — US/allied telecom networks", grid: [24, 30], activity: "Telecom network intrusion; signals collection on government targets", threat: "CRITICAL", confidence: 85, reportedAt: D, capabilities: ["CYBER", "SIGINT"], sourceUrl: SRC.CISA_SALT.url, sourceLabel: SRC.CISA_SALT.label },
  { id: "H-IP-4", layer: "INFORMATIONAL", designation: "SPAMOUFLAGE / DRAGONBRIDGE (PRC)", type: "STATE", location: "PRC-directed — global social media platforms", grid: [48, 62], activity: "Coordinated inauthentic behavior; multi-platform influence ops targeting US/allied audiences", threat: "HIGH", confidence: 74, reportedAt: D, capabilities: ["MISO", "SOCMINT"], sourceUrl: SRC.MANDIANT_DRAGONBRIDGE.url, sourceLabel: SRC.MANDIANT_DRAGONBRIDGE.label },
  { id: "H-IP-5", layer: "INFORMATIONAL", designation: "PRC STATE MEDIA (CGTN / Global Times)", type: "STATE", location: "PRC state apparatus — multilingual global distribution", grid: [40, 72], activity: "State narrative amplification; framing US presence as destabilizing; multi-language editions", threat: "MEDIUM", confidence: 80, reportedAt: D, capabilities: ["MISO", "PA"], sourceUrl: SRC.GEC_CHINA.url, sourceLabel: SRC.GEC_CHINA.label },
  { id: "H-IP-6", layer: "PHYSICAL", designation: "PLA Type-815/726-class SIGINT Vessel", type: "STATE", location: "South / East China Sea — afloat collection", grid: [58, 22], activity: "ELINT/SIGINT collection against friendly C2 and comms emissions", threat: "MEDIUM", confidence: 67, reportedAt: D, capabilities: ["EW", "SIGINT"], sourceUrl: SRC.CSIS_CHINAPOWER.url, sourceLabel: SRC.CSIS_CHINAPOWER.label },
  { id: "H-IP-7", layer: "PHYSICAL", designation: "PLA Information Support Force (PLAISF)", type: "STATE", location: "PRC — network/info systems force basing", grid: [82, 58], activity: "Reorganized PLA force for information-domain operations and C4ISR support", threat: "HIGH", confidence: 70, reportedAt: D, capabilities: ["EW", "CYBER", "MISO"], sourceUrl: SRC.IISS_ISF.url, sourceLabel: SRC.IISS_ISF.label },
];

const EUCOM: LibraryThreat[] = [
  { id: "H-EU-1", layer: "TECHNICAL", designation: "APT28 / FANCY BEAR (GRU 26165)", type: "STATE", location: "Cyberspace — Russian GRU", grid: [70, 40], activity: "Network intrusion and hack-and-leak against European government and election targets", threat: "CRITICAL", confidence: 86, reportedAt: D, capabilities: ["CYBER", "SIGINT"], sourceUrl: SRC.MITRE_APT28.url, sourceLabel: SRC.MITRE_APT28.label },
  { id: "H-EU-2", layer: "INFORMATIONAL", designation: "DOPPELGANGER (Russia)", type: "STATE", location: "Russia-directed — spoofed Western news domains", grid: [44, 60], activity: "Cloned-media disinformation forging Western outlets to push pro-Kremlin narratives; 32 domains seized by DOJ", threat: "HIGH", confidence: 78, reportedAt: D, capabilities: ["MISO", "SOCMINT", "DECEPTION"], sourceUrl: SRC.DOJ_DOPPELGANGER.url, sourceLabel: SRC.DOJ_DOPPELGANGER.label },
  { id: "H-EU-3", layer: "INFORMATIONAL", designation: "GHOSTWRITER / UNC1151", type: "PROXY", location: "Belarus/Russia-linked — European audiences", grid: [56, 50], activity: "Cyber-enabled influence compromising and spoofing officials to erode NATO cohesion (Lithuania/Latvia/Poland)", threat: "HIGH", confidence: 72, reportedAt: D, capabilities: ["MISO", "CYBER"], sourceUrl: SRC.MANDIANT_GHOSTWRITER.url, sourceLabel: SRC.MANDIANT_GHOSTWRITER.label },
  { id: "H-EU-4", layer: "PHYSICAL", designation: "Russian EW (Krasukha / Murmansk-BN)", type: "STATE", location: "Kaliningrad / Western Military District", grid: [62, 28], activity: "Ground-based electronic warfare against GPS/comms across NATO's eastern flank", threat: "MEDIUM", confidence: 65, reportedAt: D, capabilities: ["EW"], sourceUrl: SRC.RAND_EW.url, sourceLabel: SRC.RAND_EW.label },
];

const CENTCOM: LibraryThreat[] = [
  { id: "H-CC-1", layer: "TECHNICAL", designation: "MAGIC HOUND / CHARMING KITTEN (IRGC, APT35)", type: "STATE", location: "Cyberspace — IRGC-linked", grid: [72, 44], activity: "Spear-phishing and credential ops against US/regional government, journalists, and dissidents", threat: "HIGH", confidence: 80, reportedAt: D, capabilities: ["CYBER", "SIGINT"], sourceUrl: SRC.MITRE_MAGICHOUND.url, sourceLabel: SRC.MITRE_MAGICHOUND.label },
  { id: "H-CC-2", layer: "INFORMATIONAL", designation: "Iranian Influence Network (IUVM / Liberty Front Press)", type: "STATE", location: "Iran-directed — global social/web", grid: [46, 64], activity: "Coordinated inauthentic media pushing anti-US/anti-Israel narratives to regional audiences", threat: "MEDIUM", confidence: 70, reportedAt: D, capabilities: ["MISO", "SOCMINT"], sourceUrl: SRC.MANDIANT_TI.url, sourceLabel: SRC.MANDIANT_TI.label },
  { id: "H-CC-3", layer: "PHYSICAL", designation: "IRGC-QF Proxy Media Nodes", type: "PROXY", location: "Iraq / Lebanon / Yemen — proxy broadcast", grid: [58, 30], activity: "Proxy-run broadcast and messaging cells amplifying IRGC narratives in-region", threat: "MEDIUM", confidence: 60, reportedAt: D, capabilities: ["MISO", "PA"], sourceUrl: SRC.WASHINST.url, sourceLabel: SRC.WASHINST.label },
];

const AFRICOM: LibraryThreat[] = [
  { id: "H-AF-1", layer: "INFORMATIONAL", designation: "African Initiative (Russia)", type: "STATE", location: "Russia-directed — Sahel / West Africa", grid: [48, 56], activity: "Russian influence agency seeding anti-Western narratives across African media; flagged by US State GEC", threat: "HIGH", confidence: 74, reportedAt: D, capabilities: ["MISO", "SOCMINT"], sourceUrl: SRC.GEC_AFRICA.url, sourceLabel: SRC.GEC_AFRICA.label },
  { id: "H-AF-2", layer: "PHYSICAL", designation: "Wagner / Africa Corps Media Cells", type: "PROXY", location: "Mali / CAR / Burkina Faso", grid: [54, 44], activity: "PMC-linked local media houses producing pro-Russia, anti-French/US content", threat: "MEDIUM", confidence: 64, reportedAt: D, capabilities: ["MISO", "PA"], sourceUrl: SRC.AFRICACENTER.url, sourceLabel: SRC.AFRICACENTER.label },
  { id: "H-AF-3", layer: "TECHNICAL", designation: "PRC Surveillance/Telecom Footprint", type: "STATE", location: "Cyberspace — continental telecom infrastructure", grid: [66, 60], activity: "PRC-supplied telecom/surveillance infrastructure enabling data access and influence", threat: "MEDIUM", confidence: 58, reportedAt: D, capabilities: ["CYBER", "SIGINT"], sourceUrl: SRC.GEC_CHINA.url, sourceLabel: SRC.GEC_CHINA.label },
];

const SOUTHCOM: LibraryThreat[] = [
  { id: "H-SC-1", layer: "INFORMATIONAL", designation: "RT en Español / Sputnik Mundo", type: "STATE", location: "Russia state media — Latin America", grid: [50, 58], activity: "Spanish-language state media shaping anti-US sentiment across the region", threat: "MEDIUM", confidence: 72, reportedAt: D, capabilities: ["MISO", "PA"], sourceUrl: SRC.GEC_RUSSIA.url, sourceLabel: SRC.GEC_RUSSIA.label },
  { id: "H-SC-2", layer: "INFORMATIONAL", designation: "PRC Spamouflage — LatAm cluster", type: "STATE", location: "PRC-directed — regional social platforms", grid: [44, 66], activity: "Inauthentic amplification on Belt-and-Road and anti-US themes targeting LatAm audiences", threat: "MEDIUM", confidence: 60, reportedAt: D, capabilities: ["MISO", "SOCMINT"], sourceUrl: SRC.MANDIANT_DRAGONBRIDGE.url, sourceLabel: SRC.MANDIANT_DRAGONBRIDGE.label },
  { id: "H-SC-3", layer: "PHYSICAL", designation: "Venezuela (teleSUR) State Broadcast", type: "STATE", location: "Caracas — regional broadcast", grid: [58, 48], activity: "State broadcast apparatus aligned with Russian/PRC narratives in-region", threat: "LOW", confidence: 55, reportedAt: D, capabilities: ["PA", "MISO"], sourceUrl: SRC.GEC_RUSSIA.url, sourceLabel: SRC.GEC_RUSSIA.label },
];

const NORTHCOM: LibraryThreat[] = [
  { id: "H-NC-1", layer: "TECHNICAL", designation: "VOLT TYPHOON (PRC APT) — CONUS", type: "STATE", location: "Cyberspace — US critical infrastructure", grid: [40, 50], activity: "Pre-positioning in CONUS critical infrastructure; living-off-the-land", threat: "CRITICAL", confidence: 85, reportedAt: D, capabilities: ["CYBER"], sourceUrl: SRC.CISA_VOLT.url, sourceLabel: SRC.CISA_VOLT.label },
  { id: "H-NC-2", layer: "INFORMATIONAL", designation: "FIMI — US-facing Doppelganger", type: "STATE", location: "Russia-directed — US social media audiences", grid: [52, 62], activity: "Foreign information manipulation targeting US domestic discourse via spoofed outlets", threat: "HIGH", confidence: 70, reportedAt: D, capabilities: ["MISO", "SOCMINT", "DECEPTION"], sourceUrl: SRC.DOJ_DOPPELGANGER.url, sourceLabel: SRC.DOJ_DOPPELGANGER.label },
  { id: "H-NC-3", layer: "INFORMATIONAL", designation: "PRC Spamouflage — US audiences", type: "STATE", location: "PRC-directed — US social platforms", grid: [46, 70], activity: "Inauthentic personas impersonating US voters and amplifying divisive content", threat: "MEDIUM", confidence: 65, reportedAt: D, capabilities: ["MISO", "SOCMINT"], sourceUrl: SRC.MANDIANT_DRAGONBRIDGE.url, sourceLabel: SRC.MANDIANT_DRAGONBRIDGE.label },
];

// SPACECOM — global Space domain. Grids use the wide world bounds defined for
// SPACECOM in the map (lat -55..75, lng -160..170) so markers land near the
// real actor location.
const SPACECOM: LibraryThreat[] = [
  { id: "H-SP-1", layer: "PHYSICAL", designation: "PLA Aerospace Force — Counterspace", type: "STATE", location: "PRC — orbital & ground counterspace", grid: [84, 73], activity: "Co-orbital RPO satellites, ground-based ASAT, and SATCOM/GNSS jamming to deny US space capabilities", threat: "HIGH", confidence: 80, reportedAt: D, capabilities: ["EW", "CYBER", "SIGINT"], sourceUrl: SRC.CSIS_SPACE.url, sourceLabel: SRC.CSIS_SPACE.label },
  { id: "H-SP-2", layer: "PHYSICAL", designation: "Russian Counterspace (Nudol ASAT / Co-orbital)", type: "STATE", location: "Russia — Plesetsk / orbital", grid: [61, 91], activity: "Direct-ascent ASAT (Nudol) and inspector/co-orbital satellites; demonstrated debris-generating intercept", threat: "HIGH", confidence: 78, reportedAt: D, capabilities: ["EW", "SIGINT"], sourceUrl: SRC.SWF_SPACE.url, sourceLabel: SRC.SWF_SPACE.label },
  { id: "H-SP-3", layer: "PHYSICAL", designation: "GNSS Jamming / Spoofing (Theater EW)", type: "STATE", location: "Contested EW spectrum — multiple theaters", grid: [56, 78], activity: "GPS/GNSS denial and position spoofing degrading PNT for friendly forces and civil aviation", threat: "MEDIUM", confidence: 72, reportedAt: D, capabilities: ["EW"], sourceUrl: SRC.RAND_EW.url, sourceLabel: SRC.RAND_EW.label },
  { id: "H-SP-4", layer: "TECHNICAL", designation: "Cyber Threats to Space Ground Segment", type: "STATE", location: "Cyberspace — satellite ground stations / TT&C", grid: [25, 72], activity: "Network intrusion targeting satellite command & control and ground segment (e.g., Viasat-style attacks)", threat: "HIGH", confidence: 70, reportedAt: D, capabilities: ["CYBER"], sourceUrl: SRC.CISA_VOLT.url, sourceLabel: SRC.CISA_VOLT.label },
  { id: "H-SP-5", layer: "PHYSICAL", designation: "Iranian / DPRK SLV & Space-Launch Activity", type: "STATE", location: "Iran (Semnan) / DPRK (Sohae)", grid: [66, 70], activity: "Space-launch-vehicle development with dual-use ballistic-missile applications; orbital ambitions", threat: "MEDIUM", confidence: 60, reportedAt: D, capabilities: ["EW"], sourceUrl: SRC.SWF_SPACE.url, sourceLabel: SRC.SWF_SPACE.label },
];

// CYBERCOM — global Cyberspace domain. Real, publicly-attributed APTs at their
// state sponsors' locations (same wide world bounds).
const CYBERCOM: LibraryThreat[] = [
  { id: "H-CY-1", layer: "TECHNICAL", designation: "VOLT TYPHOON (PRC)", type: "STATE", location: "Cyberspace — US critical infrastructure", grid: [25, 72], activity: "Living-off-the-land pre-positioning in US critical infrastructure for potential disruptive effects", threat: "CRITICAL", confidence: 88, reportedAt: D, capabilities: ["CYBER"], sourceUrl: SRC.CISA_VOLT.url, sourceLabel: SRC.CISA_VOLT.label },
  { id: "H-CY-2", layer: "TECHNICAL", designation: "SALT TYPHOON (PRC)", type: "STATE", location: "Cyberspace — US/allied telecom networks", grid: [30, 70], activity: "Compromise of telecom providers enabling signals collection on government & political targets", threat: "CRITICAL", confidence: 85, reportedAt: D, capabilities: ["CYBER", "SIGINT"], sourceUrl: SRC.CISA_SALT.url, sourceLabel: SRC.CISA_SALT.label },
  { id: "H-CY-3", layer: "TECHNICAL", designation: "APT28 / FANCY BEAR (GRU 26165)", type: "STATE", location: "Cyberspace — Russian GRU", grid: [60, 85], activity: "Intrusion & hack-and-leak against government, military, and election infrastructure", threat: "HIGH", confidence: 86, reportedAt: D, capabilities: ["CYBER", "SIGINT"], sourceUrl: SRC.MITRE_APT28.url, sourceLabel: SRC.MITRE_APT28.label },
  { id: "H-CY-4", layer: "TECHNICAL", designation: "APT29 / COZY BEAR (SVR)", type: "STATE", location: "Cyberspace — Russian SVR", grid: [58, 86], activity: "Stealthy espionage & supply-chain intrusion (SolarWinds, cloud/identity); long-dwell collection", threat: "HIGH", confidence: 84, reportedAt: D, capabilities: ["CYBER"], sourceUrl: SRC.MITRE_APT29.url, sourceLabel: SRC.MITRE_APT29.label },
  { id: "H-CY-5", layer: "TECHNICAL", designation: "SANDWORM / APT44 (GRU 74455)", type: "STATE", location: "Cyberspace — Russian GRU", grid: [63, 84], activity: "Destructive ICS/OT attacks and wipers (Ukraine power grid, NotPetya); critical-infrastructure focus", threat: "HIGH", confidence: 82, reportedAt: D, capabilities: ["CYBER", "EW"], sourceUrl: SRC.MITRE_SANDWORM.url, sourceLabel: SRC.MITRE_SANDWORM.label },
  { id: "H-CY-6", layer: "TECHNICAL", designation: "APT41 / BARIUM (PRC MSS)", type: "STATE", location: "Cyberspace — PRC MSS", grid: [84, 73], activity: "Dual espionage & financially-motivated intrusion across sectors; supply-chain compromise", threat: "HIGH", confidence: 83, reportedAt: D, capabilities: ["CYBER", "SIGINT"], sourceUrl: SRC.MITRE_APT41.url, sourceLabel: SRC.MITRE_APT41.label },
  { id: "H-CY-7", layer: "TECHNICAL", designation: "LAZARUS GROUP (DPRK)", type: "STATE", location: "Cyberspace — DPRK RGB", grid: [87, 72], activity: "Financially-motivated theft (crypto/banking) funding the regime, plus espionage & destructive ops", threat: "HIGH", confidence: 80, reportedAt: D, capabilities: ["CYBER"], sourceUrl: SRC.MITRE_LAZARUS.url, sourceLabel: SRC.MITRE_LAZARUS.label },
  { id: "H-CY-8", layer: "TECHNICAL", designation: "MAGIC HOUND / CHARMING KITTEN (IRGC)", type: "STATE", location: "Cyberspace — IRGC-linked", grid: [64, 70], activity: "Spear-phishing & credential ops against government, dissidents, and journalists; influence-enabling access", threat: "MEDIUM", confidence: 76, reportedAt: D, capabilities: ["CYBER", "SIGINT"], sourceUrl: SRC.MITRE_MAGICHOUND.url, sourceLabel: SRC.MITRE_MAGICHOUND.label },
];

const LIBRARY: Record<GCCId, LibraryThreat[]> = {
  INDOPACOM, EUCOM, CENTCOM, AFRICOM, SOUTHCOM, NORTHCOM, SPACECOM, CYBERCOM,
};

export function getHistoricalThreats(gcc: GCCId): LibraryThreat[] {
  return LIBRARY[gcc] ?? INDOPACOM;
}

// Historical reference narratives (Informational layer) — keeps the narrative
// board and informational layer populated before a live assessment runs.
const HIST_NARRATIVES: Record<GCCId, NarrativeThread[]> = {
  INDOPACOM: [
    { id: "HN-IP-1", title: "US Presence 'Destabilizes' the Region", platform: "CGTN / WeChat / Telegram", sentiment: -0.78, reach: 42000000, velocity: 2100, adversarial: true, summary: "State-amplified framing that US/allied posture threatens regional stability.", trend: "RISING", sourceUrl: SRC.GEC_CHINA.url, sourceLabel: SRC.GEC_CHINA.label },
    { id: "HN-IP-2", title: "Taiwan Election 'Interference' Claims", platform: "Spamouflage networks", sentiment: -0.66, reach: 9500000, velocity: 1400, adversarial: true, summary: "Inauthentic amplification of fraud/interference claims around Taiwan elections.", trend: "RISING", sourceUrl: SRC.MANDIANT_DRAGONBRIDGE.url, sourceLabel: SRC.MANDIANT_DRAGONBRIDGE.label },
    { id: "HN-IP-3", title: "US-Japan Alliance Value (Friendly)", platform: "Official USINDOPACOM / JSDF", sentiment: 0.62, reach: 2800000, velocity: 160, adversarial: false, summary: "Friendly narrative emphasizing alliance value and shared security interests.", trend: "STABLE" },
  ],
  EUCOM: [
    { id: "HN-EU-1", title: "NATO 'Provocation' Narrative", platform: "Doppelganger / RT", sentiment: -0.72, reach: 18000000, velocity: 1300, adversarial: true, summary: "Kremlin framing of NATO support as escalatory/provocative.", trend: "RISING", sourceUrl: SRC.GEC_RUSSIA.url, sourceLabel: SRC.GEC_RUSSIA.label },
    { id: "HN-EU-2", title: "Ukraine Aid 'Fatigue' Messaging", platform: "Spoofed Western outlets", sentiment: -0.55, reach: 12000000, velocity: 900, adversarial: true, summary: "Manufactured war-fatigue content to erode European support.", trend: "RISING", sourceUrl: SRC.DOJ_DOPPELGANGER.url, sourceLabel: SRC.DOJ_DOPPELGANGER.label },
  ],
  CENTCOM: [
    { id: "HN-CC-1", title: "Anti-US Basing Narrative", platform: "Iranian proxy media", sentiment: -0.68, reach: 7000000, velocity: 700, adversarial: true, summary: "Proxy-amplified opposition to US regional presence.", trend: "STABLE", sourceUrl: SRC.MANDIANT_TI.url, sourceLabel: SRC.MANDIANT_TI.label },
  ],
  AFRICOM: [
    { id: "HN-AF-1", title: "Anti-Western 'Neocolonialism' Framing", platform: "African Initiative outlets", sentiment: -0.7, reach: 8000000, velocity: 600, adversarial: true, summary: "Russia-seeded narrative framing Western engagement as neocolonial.", trend: "RISING", sourceUrl: SRC.GEC_AFRICA.url, sourceLabel: SRC.GEC_AFRICA.label },
  ],
  SOUTHCOM: [
    { id: "HN-SC-1", title: "US 'Intervention' Narrative", platform: "RT en Español / teleSUR", sentiment: -0.6, reach: 6000000, velocity: 500, adversarial: true, summary: "State-media framing of US regional engagement as interventionist.", trend: "STABLE", sourceUrl: SRC.GEC_RUSSIA.url, sourceLabel: SRC.GEC_RUSSIA.label },
  ],
  NORTHCOM: [
    { id: "HN-NC-1", title: "Domestic Division Amplification", platform: "FIMI personas", sentiment: -0.5, reach: 9000000, velocity: 800, adversarial: true, summary: "Foreign amplification of divisive US domestic discourse.", trend: "RISING", sourceUrl: SRC.DOJ_DOPPELGANGER.url, sourceLabel: SRC.DOJ_DOPPELGANGER.label },
  ],
  SPACECOM: [
    { id: "HN-SP-1", title: "US 'Weaponizing Space' Narrative", platform: "RT / CGTN / Global Times", sentiment: -0.68, reach: 11000000, velocity: 700, adversarial: true, summary: "PRC/Russia framing of US Space Force & SDA as the cause of space militarization, deflecting from their own counterspace tests.", trend: "RISING", sourceUrl: SRC.CSIS_SPACE.url, sourceLabel: SRC.CSIS_SPACE.label },
    { id: "HN-SP-2", title: "Responsible Space Behavior (Friendly)", platform: "Official USSPACECOM / State", sentiment: 0.58, reach: 2200000, velocity: 130, adversarial: false, summary: "Friendly narrative on norms, debris mitigation, and the ASAT-test moratorium.", trend: "STABLE" },
  ],
  CYBERCOM: [
    { id: "HN-CY-1", title: "Cyber Attribution Denial / False-Flag", platform: "State media / spokes channels", sentiment: -0.6, reach: 8000000, velocity: 650, adversarial: true, summary: "Adversary denial of attributed intrusions and counter-accusations that the US is the primary cyber aggressor.", trend: "STABLE", sourceUrl: SRC.GEC_RUSSIA.url, sourceLabel: SRC.GEC_RUSSIA.label },
    { id: "HN-CY-2", title: "Hacktivist Critical-Infra Bravado", platform: "Telegram hacktivist channels", sentiment: -0.55, reach: 5000000, velocity: 900, adversarial: true, summary: "Pro-state hacktivist personas amplifying claimed attacks on water/energy utilities to sow fear.", trend: "RISING", sourceUrl: SRC.CISA_VOLT.url, sourceLabel: SRC.CISA_VOLT.label },
  ],
};

export function getHistoricalNarratives(gcc: GCCId): NarrativeThread[] {
  return HIST_NARRATIVES[gcc] ?? HIST_NARRATIVES.INDOPACOM;
}
