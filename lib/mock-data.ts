// Mock data representing the IE operational environment

export type ThreatLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type SensorType = "SIGINT" | "OSINT" | "HUMINT" | "CYBER" | "ISR" | "SOCMINT";
export type IOCapability = "MISO" | "CYBER" | "EW" | "DECEPTION" | "OPSEC" | "MILDEC" | "PA";

// ── COA Workflow & Annex Generation Types ────────────────────────────────

export type COAStatus = "DRAFT" | "ANALYST_SELECTABLE" | "COMMANDER_ENDORSED" | "APPROVED";

export interface COATask {
  id: string;
  capability: IOCapability;
  description: string;
  owner: string;
  authority: string;
  nlt: string;
  moeSupported: string[];
  phase: string;
}

export interface InformationEffect {
  id: string;
  effectType: "CREATE" | "PRESERVE" | "DENY" | "DEGRADE" | "DESTROY";
  target: string;
  description: string;
  moeLinked: string[];
}

export interface AuthorityRequirement {
  authority: string;
  capability: IOCapability;
  status: "OBTAINED" | "PENDING" | "NOT_REQUESTED";
  requiredBy: string;
  legalReview: boolean;
}

export type HumanReviewStatus = "PENDING_REVIEW" | "REVIEWED" | "APPROVED" | "REJECTED";

export interface AnnexGeneration {
  annexId: string;
  docType: "annex-i" | "itco";
  selectedCoaId: string;
  selectedCoaVersion: number;
  selectedCoaStatus: COAStatus;
  generationTimestamp: string;
  generatedBy: string;
  classification: string;
  outputHash: string;
  humanReviewStatus: HumanReviewStatus;
  gcc: string;
  operationName: string;
  planningToolId: string;
}

export interface SensorFeed {
  id: string;
  type: SensorType;
  source: string;
  timestamp: string;
  content: string;
  language?: string;
  threat: ThreatLevel;
  confidence: number;
  tags: string[];
  processed: boolean;
  anomaly: boolean;
}

export interface COAOption {
  id: string;
  name: string;
  capabilities: IOCapability[];
  sequence: string[];
  targetAudience: string;
  objective: string;
  estimatedEffect: string;
  successProbability: number;
  timeToEffect: string;
  risk: ThreatLevel;
  resourceRequirement: string;
  moePredicted: number;
  // COA workflow & Annex generation fields
  status: COAStatus;
  version: number;
  createdBy: string;
  approvedBy: string | null;
  approvedTimestamp: string | null;
  authorityRequirements: AuthorityRequirement[];
  informationEffects: InformationEffect[];
  tasks: COATask[];
  posture: "ESCALATORY" | "DEFENSIVE" | "BALANCED";
  linesOfEffort: string[];
}

export interface MOEMetric {
  id: string;
  name: string;
  objective: string;
  target: number;
  current: number;
  trend: "UP" | "DOWN" | "STABLE";
  lastUpdated: string;
  unit: string;
  status: "GREEN" | "AMBER" | "RED";
  /** When true, GREEN = current ≤ target (e.g. adversary IO activity, hostile narrative reach).
   *  When false/undefined, GREEN = current ≥ target (e.g. sentiment, ally confidence). */
  lowerIsBetter?: boolean;
  /** One-line plain-English explanation of how this value is measured */
  measurementNote?: string;
}

export interface MOPMetric {
  id: string;
  task: string;
  capability: IOCapability;
  planned: number;
  actual: number;
  unit: string;
  status: "GREEN" | "AMBER" | "RED";
}

export interface SignatureItem {
  id: string;
  category: "TECHNICAL" | "ADMINISTRATIVE" | "PHYSICAL";
  description: string;
  riskLevel: ThreatLevel;
  currentValue: string;
  threshold: string;
  recommendation: string;
  exposureScore: number;
}

export interface ThreatEntity {
  id: string;
  designation: string;
  type: "STATE" | "NON-STATE" | "PROXY" | "UNKNOWN";
  location: string;
  grid: [number, number]; // normalized 0-100
  activity: string;
  threat: ThreatLevel;
  confidence: number;
  lastSeen: string;
  capabilities: string[];
  sourceUrl: string;   // Verifiable public source (CISA, DOJ, MITRE ATT&CK, etc.)
  sourceLabel: string; // Short label for the source
}

export interface NarrativeThread {
  id: string;
  title: string;
  platform: string;
  sentiment: number; // -1 to 1
  reach: number;
  velocity: number; // posts/hr
  adversarial: boolean;
  summary: string;
  trend: "RISING" | "FALLING" | "STABLE";
}

export interface RunningEstimate {
  classification: string;
  dtg: string;
  operationName: string;
  missionStatement: string;
  ieCondition: "PERMISSIVE" | "UNCERTAIN" | "HOSTILE";
  ieSituation: string;
  adversaryCapabilities: string[];
  friendlyCapabilities: string[];
  assumptions: string[];
  limitations: string[];
  risks: string[];
  recommendations: string[];
  cdruObjective: string;
  priority: "IE1" | "IE2" | "IE3";
}

// ── Module 1: Conceal / Reveal ──────────────────────────────────────────────

export interface ConcealRevealIndicator {
  id: string;
  name: string;
  /** 0-100 normalised score */
  value: number;
  /** Weight in composite calculation (all weights sum to 1.0) */
  weight: number;
  trend: "UP" | "DOWN" | "STABLE";
  /** Last updated ISO timestamp */
  updatedAt: string;
  /** Source system or collection method */
  source: string;
}

export interface ConcealRevealIndex {
  /** Composite score 0-100 */
  composite: number;
  status: "GREEN" | "AMBER" | "RED";
  posture: "CONCEAL" | "REVEAL" | "MIXED";
  indicators: ConcealRevealIndicator[];
  computedAt: string;
}

// ── Module 2: Signature Management ──────────────────────────────────────────

export interface EMCONReading {
  id: string;
  emitter: string;
  status: "SILENT" | "LOW" | "NORMAL" | "ELEVATED" | "VIOLATION";
  reading_dbm: number;
  threshold_dbm: number;
  location: string;
  timestamp: string;
}

export interface OPSECViolation {
  id: string;
  category: "SOCIAL_MEDIA" | "COMMS" | "PHYSICAL" | "DIGITAL" | "ADMINISTRATIVE";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  unit: string;
  timestamp: string;
  remediation: string;
  resolved: boolean;
}

export interface SATVULWindow {
  id: string;
  satellite: string;
  passStart: string;
  passEnd: string;
  elevationDeg: number;
  sensorType: "OPTICAL" | "SAR" | "ELINT";
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  mitigationStatus: "MITIGATED" | "PENDING" | "UNMITIGATED";
}

export interface SignatureRiskComposite {
  /** 0-100 composite risk score */
  composite: number;
  status: "GREEN" | "AMBER" | "RED";
  emconScore: number;
  opsecScore: number;
  satvulScore: number;
  emconReadings: EMCONReading[];
  opsecViolations: OPSECViolation[];
  satvulWindows: SATVULWindow[];
  computedAt: string;
}

// ── Module 3: Adversary Perceptions ─────────────────────────────────────────

export type SentimentCategory = "HOSTILE" | "PROVOCATIVE" | "DEFENSIVE" | "NEUTRAL" | "CONCILIATORY";

export interface AdversaryMediaItem {
  id: string;
  source: string;
  sourceType: "STATE_MEDIA" | "PROXY_OUTLET" | "SOCIAL_AMPLIFIER";
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  language: string;
  sentiment: number; // -1.0 to +1.0
  sentimentCategory: SentimentCategory;
  matchedKeywords: string[];
  reach: number;
}

export interface PerceptionShiftEvent {
  id: string;
  timestamp: string;
  triggerEvent: string;
  sentimentBefore: number;
  sentimentAfter: number;
  magnitude: number;
  sources: string[];
}

export interface AdversaryPerceptionState {
  /** Overall adversary sentiment score -1.0 to +1.0 */
  overallSentiment: number;
  sentimentCategory: SentimentCategory;
  escalationIndex: number; // 0-100
  mediaItems: AdversaryMediaItem[];
  shiftEvents: PerceptionShiftEvent[];
  mediaVolume24h: number;
  computedAt: string;
}

// ── Module 4: Gray Zone Activity ────────────────────────────────────────────

export type GrayZoneCategory =
  | "UNDERSEA_CABLE"
  | "AIS_ANOMALY"
  | "FISHING_MILITIA"
  | "EEZ_VIOLATION"
  | "ADIZ_INCURSION"
  | "UAS_INCIDENT";

export interface GrayZoneIncident {
  id: string;
  category: GrayZoneCategory;
  title: string;
  description: string;
  location: [number, number]; // [lat, lng]
  timestamp: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  attributionConfidence: number; // 0-100
  suspectedActor: string;
  status: "ACTIVE" | "RESOLVED" | "MONITORING";
  correlatedNarrativeId?: string;
}

export interface GrayZoneOverlay {
  eezBoundaries: Array<{ name: string; coordinates: [number, number][] }>;
  adizBoundaries: Array<{ name: string; coordinates: [number, number][] }>;
  underseaCables: Array<{
    name: string;
    path: [number, number][];
    status: "NORMAL" | "DISRUPTED" | "UNKNOWN";
  }>;
}

export interface GrayZoneState {
  activityIndex: number; // 0-100
  status: "GREEN" | "AMBER" | "RED";
  incidents: GrayZoneIncident[];
  overlay: GrayZoneOverlay;
  correlationScore: number; // -1 to 1 Pearson with narrative shifts
  computedAt: string;
}

// ── Module 5: Air & Ballistic Missile Defense ───────────────────────────────

export type MissileType =
  | "BALLISTIC_SHORT"
  | "BALLISTIC_MEDIUM"
  | "BALLISTIC_INTERMEDIATE"
  | "ICBM"
  | "CRUISE"
  | "HYPERSONIC"
  | "UAV_DRONE";

export interface MissileEvent {
  id: string;
  missileType: MissileType;
  /** Claimed launch location [lat, lng] */
  launchLocation: [number, number];
  /** Target area (if reported) [lat, lng] */
  targetLocation?: [number, number];
  timestamp: string;
  source: string;
  sourceReliability: number; // 0-100
  /** Cross-source corroboration count */
  crossSourceCount: number;
  /** OSINT confidence score 0-100 (computed server-side) */
  confidenceScore: number;
  interceptClaimed: boolean;
  interceptSource?: string;
  /** Dedup cluster hash — events with same hash are treated as duplicates */
  dedupHash: string;
  status: "CONFIRMED" | "PROBABLE" | "UNCONFIRMED" | "RETRACTED";
}

export interface ABMDMetrics {
  launchFrequency7d: number;
  interceptRate: number; // 0-1 ratio
  escalationIndex: number; // 0-100
  avgConfidence: number; // 0-100
}

export interface ABMDState {
  metrics: ABMDMetrics;
  events: MissileEvent[];
  status: "GREEN" | "AMBER" | "RED";
  /** 7-day timeline bins for chart */
  timeline: Array<{ date: string; launches: number; intercepts: number }>;
  computedAt: string;
}

// --- DATA ---

export const sensorFeeds: SensorFeed[] = [
  {
    id: "SF001",
    type: "SIGINT",
    source: "NSA-TAO Collection Node Alpha",
    timestamp: "2025-03-15T08:42:17Z",
    content: "Intercept of encrypted comms from suspected IO cell. Linguistic analysis suggests Mandarin with technical jargon referencing 'narrative shaping' op against MEF PACOM forces.",
    language: "ZH",
    threat: "HIGH",
    confidence: 78,
    tags: ["IO", "INFLUENCE", "PRC"],
    processed: true,
    anomaly: false,
  },
  {
    id: "SF002",
    type: "SOCMINT",
    source: "CENTCOM Social Media Monitoring",
    timestamp: "2025-03-15T08:51:03Z",
    content: "Coordinated inauthentic behavior detected: 3,200 bot accounts amplifying anti-USMC narrative on Telegram. Spike: 840% above baseline. Geo-tagged: Okinawa, Guam clusters.",
    threat: "CRITICAL",
    confidence: 91,
    tags: ["DISINFORMATION", "BOTS", "OKINAWA"],
    processed: true,
    anomaly: true,
  },
  {
    id: "SF003",
    type: "CYBER",
    source: "CYBERCOM Sentinel Feed",
    timestamp: "2025-03-15T09:03:44Z",
    content: "Detected APT41 TTPs in network traffic targeting MIG C2 infrastructure. Possible data exfiltration attempt. MITRE ATT&CK: T1071.001 (Web Protocols), T1041 (Exfiltration Over C2).",
    threat: "CRITICAL",
    confidence: 85,
    tags: ["APT41", "CYBER", "C2", "EXFILTRATION"],
    processed: false,
    anomaly: true,
  },
  {
    id: "SF004",
    type: "OSINT",
    source: "NCSC Open Source Feed",
    timestamp: "2025-03-15T09:14:22Z",
    content: "Beijing Global Times and CGTN broadcasting narrative: 'USMC Okinawa presence destabilizes region.' Translated across 14 language editions. Estimated reach: 48M impressions/24hr.",
    language: "MULTI",
    threat: "HIGH",
    confidence: 95,
    tags: ["PROPAGANDA", "CGTN", "OKINAWA", "NARRATIVE"],
    processed: true,
    anomaly: false,
  },
  {
    id: "SF005",
    type: "ISR",
    source: "RQ-4 Global Hawk HUMSAR",
    timestamp: "2025-03-15T09:28:55Z",
    content: "EW emitter activity detected NW quadrant. Signal characteristics match PRC Type-726 SIGINT platform. Bearing 287°, estimated range 85nm. Activity pattern suggests ELINT collection on friendly comms.",
    threat: "MEDIUM",
    confidence: 67,
    tags: ["EW", "ELINT", "ISR"],
    processed: true,
    anomaly: false,
  },
  {
    id: "SF006",
    type: "HUMINT",
    source: "HUMINT Asset DELTA-7",
    timestamp: "2025-03-15T07:55:10Z",
    content: "Source reports local population sentiment shifting: 62% oppose USMC presence (up from 44% last quarter). IO cell reportedly distributing pamphlets near Gate 2 Kadena. Translation included.",
    threat: "MEDIUM",
    confidence: 62,
    tags: ["SENTIMENT", "POPULATION", "INFLUENCE"],
    processed: true,
    anomaly: false,
  },
  {
    id: "SF007",
    type: "SOCMINT",
    source: "DIA Social Analytics Platform",
    timestamp: "2025-03-15T09:41:17Z",
    content: "Deepfake video circulating on WeChat/LINE: fabricated USMC commander making inflammatory statements. Video forensics: 94% AI-generated confidence. Velocity: 12K shares/hr.",
    threat: "CRITICAL",
    confidence: 94,
    tags: ["DEEPFAKE", "VIDEO", "DISINFORMATION", "VIRAL"],
    processed: false,
    anomaly: true,
  },
  {
    id: "SF008",
    type: "SIGINT",
    source: "NIFC-CA Tasked Collection",
    timestamp: "2025-03-15T09:55:33Z",
    content: "Radio traffic from known IO facilitation network. Message fragmented; partial decode: '...amplify Phase 2 narrative... timing coordinated with 0300L...' Suggests synchronized multi-domain IO event.",
    language: "RU",
    threat: "HIGH",
    confidence: 71,
    tags: ["IO", "COORDINATION", "PHASE2"],
    processed: false,
    anomaly: true,
  },
];

export const coaOptions: COAOption[] = [
  {
    id: "COA-A",
    name: "Operation CLEAR SIGNAL",
    capabilities: ["MISO", "PA", "CYBER"],
    sequence: [
      "T+0h: PA press release rebutting deepfake narrative (EN/JA/ZH)",
      "T+2h: MISO broadcast via COMMANDO SOLO — local FM/AM band",
      "T+4h: Coordinated social media counter-narrative push (official accounts)",
      "T+8h: CYBER takedown request via CYBERCOM for bot infrastructure",
      "T+24h: Follow-on MISO product drop — trilingual leaflet via airdrop",
    ],
    targetAudience: "Okinawan civilian population & regional media ecosystem",
    objective: "Counter adversary deepfake narrative; restore confidence in USMC presence",
    estimatedEffect: "40-60% reduction in hostile narrative reach within 48hrs",
    successProbability: 74,
    timeToEffect: "48-72 hours",
    risk: "LOW",
    resourceRequirement: "COMMANDO SOLO (1x EC-130J), 3x MISO teams, PA coordination",
    moePredicted: 72,
    status: "ANALYST_SELECTABLE",
    version: 1,
    createdBy: "IO-PLANNER-01",
    approvedBy: null,
    approvedTimestamp: null,
    posture: "BALANCED",
    linesOfEffort: [
      "LOE 1: Counter Adversary Narrative (PA/MISO)",
      "LOE 2: Restore Population Confidence (MISO)",
      "LOE 3: Degrade Bot Infrastructure (CYBER)",
    ],
    authorityRequirements: [
      { authority: "PSYOP Approval Authority (USSOCOM)", capability: "MISO", status: "OBTAINED", requiredBy: "H-2", legalReview: false },
      { authority: "III MEF PAO Approval", capability: "PA", status: "OBTAINED", requiredBy: "H-1", legalReview: false },
      { authority: "CYBERCOM DCO (Title 10)", capability: "CYBER", status: "PENDING", requiredBy: "H-8", legalReview: true },
    ],
    informationEffects: [
      { id: "IE-A1", effectType: "DENY", target: "Adversary deepfake narrative", description: "Deny adversary ability to sustain deepfake narrative reach", moeLinked: ["MOE-1"] },
      { id: "IE-A2", effectType: "CREATE", target: "Population confidence", description: "Create conditions for restored population confidence via PA/MISO", moeLinked: ["MOE-2"] },
      { id: "IE-A3", effectType: "DEGRADE", target: "Bot infrastructure", description: "Degrade adversary bot C2 via CYBERCOM platform takedown", moeLinked: ["MOE-3"] },
    ],
    tasks: [
      { id: "T-A1", capability: "PA", description: "Issue multilingual press release rebutting deepfake narrative (EN/JA/ZH)", owner: "Theater PAO / IO PA Section", authority: "III MEF PAO approval", nlt: "H+0", moeSupported: ["MOE-1", "MOE-2"], phase: "SHAPE" },
      { id: "T-A2", capability: "MISO", description: "Broadcast counter-narrative via COMMANDO SOLO on local FM/AM band", owner: "IO-designated MISO elements / 1st MIG", authority: "PSYOP Approval Authority", nlt: "H+2", moeSupported: ["MOE-1"], phase: "EXECUTE" },
      { id: "T-A3", capability: "MISO", description: "Coordinate social media counter-narrative push via official accounts", owner: "IO-designated MISO elements / 1st MIG", authority: "PSYOP Approval Authority", nlt: "H+4", moeSupported: ["MOE-1", "MOE-2"], phase: "EXECUTE" },
      { id: "T-A4", capability: "CYBER", description: "Submit CYBERCOM takedown request for adversary bot infrastructure", owner: "CYBERCOM-coordinated element", authority: "Title 10/50 legal review", nlt: "H+8", moeSupported: ["MOE-3"], phase: "EXECUTE" },
      { id: "T-A5", capability: "MISO", description: "Follow-on trilingual leaflet drop via airdrop", owner: "IO-designated MISO elements / 1st MIG", authority: "PSYOP Approval Authority", nlt: "H+24", moeSupported: ["MOE-1", "MOE-2"], phase: "DOMINATE" },
    ],
  },
  {
    id: "COA-B",
    name: "Operation SILENT THUNDER",
    capabilities: ["CYBER", "EW", "DECEPTION"],
    sequence: [
      "T+0h: EW jamming of IO cell tactical comms (78-82 MHz band)",
      "T+2h: CYBER — degrade bot C2 infrastructure via coordinated DCO",
      "T+6h: MILDEC — feed false SIGINT to adversary collection platforms",
      "T+12h: DECEPTION op — insert counter-narrative into adversary IO channels",
      "T+24h: Assess and adapt based on MOE feedback",
    ],
    targetAudience: "Adversary IO apparatus and technical infrastructure",
    objective: "Degrade adversary IO capability; disrupt synchronized multi-domain IO event",
    estimatedEffect: "Disruption of adversary IO cell for 24-72hr window",
    successProbability: 61,
    timeToEffect: "6-12 hours",
    risk: "MEDIUM",
    resourceRequirement: "EC-130H Compass Call, CYBERCOM DCO authority, MILDEC planning cell",
    moePredicted: 58,
    status: "COMMANDER_ENDORSED",
    version: 1,
    createdBy: "IO-PLANNER-01",
    approvedBy: "CDR-III-MEF-G7",
    approvedTimestamp: null,
    posture: "ESCALATORY",
    linesOfEffort: [
      "LOE 1: Disrupt Adversary IO Infrastructure (CYBER/EW)",
      "LOE 2: Degrade Adversary SIGINT Collection (EW)",
      "LOE 3: Deceive Adversary Targeting Cycle (DECEPTION)",
    ],
    authorityRequirements: [
      { authority: "CYBERCOM DCO (Title 10)", capability: "CYBER", status: "PENDING", requiredBy: "H-6", legalReview: true },
      { authority: "INDOPACOM EW Deconfliction (JFC-IMC)", capability: "EW", status: "OBTAINED", requiredBy: "H-4", legalReview: false },
      { authority: "JFC Deception Coordination", capability: "DECEPTION", status: "PENDING", requiredBy: "H-6", legalReview: false },
    ],
    informationEffects: [
      { id: "IE-B1", effectType: "DEGRADE", target: "Adversary bot C2", description: "Degrade adversary bot command-and-control infrastructure via coordinated DCO", moeLinked: ["MOE-3"] },
      { id: "IE-B2", effectType: "DENY", target: "Adversary SIGINT", description: "Deny adversary SIGINT collection on friendly tactical communications", moeLinked: ["MOE-5"] },
      { id: "IE-B3", effectType: "DESTROY", target: "Adversary IO targeting cycle", description: "Destroy adversary IO targeting cycle through false SIGINT injection", moeLinked: ["MOE-3"] },
    ],
    tasks: [
      { id: "T-B1", capability: "EW", description: "Jam adversary IO cell tactical comms (78-82 MHz band)", owner: "Theater EW platform", authority: "EMR via JFC-IMC", nlt: "H+0", moeSupported: ["MOE-5"], phase: "SHAPE" },
      { id: "T-B2", capability: "CYBER", description: "Degrade bot C2 infrastructure via coordinated DCO", owner: "CYBERCOM-coordinated element", authority: "Title 10/50 legal review", nlt: "H+2", moeSupported: ["MOE-3"], phase: "EXECUTE" },
      { id: "T-B3", capability: "DECEPTION", description: "Feed false SIGINT to adversary collection platforms", owner: "Deception planning cell", authority: "JFC coordination", nlt: "H+6", moeSupported: ["MOE-3", "MOE-5"], phase: "EXECUTE" },
      { id: "T-B4", capability: "DECEPTION", description: "Insert counter-narrative into adversary IO channels", owner: "Deception planning cell", authority: "JFC coordination", nlt: "H+12", moeSupported: ["MOE-1"], phase: "DOMINATE" },
      { id: "T-B5", capability: "OPSEC", description: "Assess effectiveness and adapt based on MOE feedback", owner: "Theater OPSEC Cell", authority: "Unit OPSEC Officer", nlt: "H+24", moeSupported: ["MOE-1", "MOE-3"], phase: "DOMINATE" },
    ],
  },
  {
    id: "COA-C",
    name: "Operation FULL SPECTRUM",
    capabilities: ["MISO", "CYBER", "EW", "PA", "OPSEC", "DECEPTION"],
    sequence: [
      "T+0h: OPSEC lockdown — restrict all friendly digital signatures",
      "T+1h: EW — targeted suppression of adversary SIGINT platform",
      "T+2h: CYBER DCO — neutralize APT41 persistence in MIG C2",
      "T+3h: PA — multilingual press conference addressing deepfake",
      "T+6h: MISO broadcast — COMMANDO SOLO + digital platforms",
      "T+12h: DECEPTION feed — degrade adversary narrative targeting cycle",
      "T+24h: Full MOE/MOP assessment; iterate",
    ],
    targetAudience: "Full spectrum: adversary IO apparatus + local population + international media",
    objective: "Simultaneous degradation of adversary capability + counter-narrative + population influence",
    estimatedEffect: "Comprehensive IE dominance within AO within 72hrs",
    successProbability: 83,
    timeToEffect: "24-48 hours",
    risk: "HIGH",
    resourceRequirement: "Full MIG activation, CYBERCOM coordination, INDOPACOM approval, EC-130H/J",
    moePredicted: 86,
    status: "APPROVED",
    version: 1,
    createdBy: "IO-PLANNER-01",
    approvedBy: "CDR-III-MEF-G7",
    approvedTimestamp: "2026-02-28T14:00:00Z",
    posture: "ESCALATORY",
    linesOfEffort: [
      "LOE 1: Counter Adversary Narrative (MISO/PA)",
      "LOE 2: Degrade Adversary IO Infrastructure (CYBER/EW)",
      "LOE 3: Protect Friendly Force Information (OPSEC)",
      "LOE 4: Shape Regional Information Environment (DECEPTION/MISO)",
    ],
    authorityRequirements: [
      { authority: "CYBERCOM DCO (Title 10)", capability: "CYBER", status: "PENDING", requiredBy: "H-6", legalReview: true },
      { authority: "INDOPACOM EW Deconfliction (JFC-IMC)", capability: "EW", status: "OBTAINED", requiredBy: "H-4", legalReview: false },
      { authority: "PSYOP Approval Authority (USSOCOM)", capability: "MISO", status: "OBTAINED", requiredBy: "H-2", legalReview: false },
      { authority: "III MEF PAO Approval", capability: "PA", status: "OBTAINED", requiredBy: "H-1", legalReview: false },
      { authority: "Unit OPSEC Officer", capability: "OPSEC", status: "OBTAINED", requiredBy: "H-0", legalReview: false },
      { authority: "JFC Deception Coordination", capability: "DECEPTION", status: "PENDING", requiredBy: "H-6", legalReview: false },
    ],
    informationEffects: [
      { id: "IE-C1", effectType: "DENY", target: "Adversary narrative reach", description: "Deny adversary IO apparatus the ability to achieve narrative superiority", moeLinked: ["MOE-1"] },
      { id: "IE-C2", effectType: "DEGRADE", target: "APT41 C2 infrastructure", description: "Degrade APT41 persistent access to MIG C2 network", moeLinked: ["MOE-3"] },
      { id: "IE-C3", effectType: "CREATE", target: "Positive population sentiment", description: "Create conditions for favorable population sentiment through multilingual counter-narrative", moeLinked: ["MOE-2"] },
      { id: "IE-C4", effectType: "PRESERVE", target: "Friendly force OPSEC", description: "Preserve operational security of friendly force operations", moeLinked: ["MOE-6"] },
      { id: "IE-C5", effectType: "DESTROY", target: "Adversary targeting cycle", description: "Destroy adversary narrative targeting cycle through deception operations", moeLinked: ["MOE-3"] },
    ],
    tasks: [
      { id: "T-C1", capability: "OPSEC", description: "Execute OPSEC lockdown — restrict all friendly digital signatures", owner: "Theater OPSEC Cell", authority: "Unit OPSEC Officer", nlt: "H+0", moeSupported: ["MOE-6"], phase: "SHAPE" },
      { id: "T-C2", capability: "EW", description: "Targeted suppression of adversary SIGINT platform", owner: "Theater EW platform", authority: "EMR via JFC-IMC", nlt: "H+1", moeSupported: ["MOE-5"], phase: "SHAPE" },
      { id: "T-C3", capability: "CYBER", description: "DCO action — neutralize APT41 persistence in MIG C2", owner: "CYBERCOM-coordinated element", authority: "Title 10/50 legal review", nlt: "H+2", moeSupported: ["MOE-3"], phase: "EXECUTE" },
      { id: "T-C4", capability: "PA", description: "Multilingual press conference addressing deepfake video", owner: "Theater PAO / IO PA Section", authority: "III MEF PAO approval", nlt: "H+3", moeSupported: ["MOE-2", "MOE-1"], phase: "EXECUTE" },
      { id: "T-C5", capability: "MISO", description: "Broadcast via COMMANDO SOLO + digital platform counter-narrative", owner: "IO-designated MISO elements / 1st MIG", authority: "PSYOP Approval Authority", nlt: "H+6", moeSupported: ["MOE-1", "MOE-4"], phase: "EXECUTE" },
      { id: "T-C6", capability: "DECEPTION", description: "Deception feed — degrade adversary narrative targeting cycle", owner: "Deception planning cell", authority: "JFC coordination", nlt: "H+12", moeSupported: ["MOE-3"], phase: "DOMINATE" },
      { id: "T-C7", capability: "MISO", description: "Full MOE/MOP assessment and iterate planning cycle", owner: "IO-designated MISO elements / 1st MIG", authority: "PSYOP Approval Authority", nlt: "H+24", moeSupported: ["MOE-1", "MOE-2", "MOE-3"], phase: "DOMINATE" },
    ],
  },
];

export const moeMetrics: MOEMetric[] = [
  {
    id: "MOE-1",
    name: "Hostile Narrative Penetration",
    objective: "Reduce adversary narrative reach below 15% market share",
    target: 15,
    current: 38,
    trend: "DOWN",
    lastUpdated: "2025-03-15T09:00Z",
    unit: "% reach",
    status: "RED",
  },
  {
    id: "MOE-2",
    name: "Population Sentiment (Pro-USMC)",
    objective: "Maintain >50% favorable sentiment in target population",
    target: 50,
    current: 41,
    trend: "DOWN",
    lastUpdated: "2025-03-15T08:30Z",
    unit: "%",
    status: "RED",
  },
  {
    id: "MOE-3",
    name: "Adversary IO Cell Activity",
    objective: "Reduce detected IO actions to <3/day",
    target: 3,
    current: 11,
    trend: "UP",
    lastUpdated: "2025-03-15T09:15Z",
    unit: "actions/day",
    status: "RED",
  },
  {
    id: "MOE-4",
    name: "Counter-Narrative Amplification",
    objective: "Achieve >2:1 friendly-to-hostile content ratio",
    target: 200,
    current: 87,
    trend: "UP",
    lastUpdated: "2025-03-15T07:45Z",
    unit: "% ratio",
    status: "AMBER",
  },
  {
    id: "MOE-5",
    name: "Ally Confidence Index",
    objective: "Maintain ally confidence above 70/100",
    target: 70,
    current: 74,
    trend: "STABLE",
    lastUpdated: "2025-03-15T06:00Z",
    unit: "index",
    status: "GREEN",
  },
  {
    id: "MOE-6",
    name: "Deepfake Takedown Rate",
    objective: "Remove 90%+ of detected deepfake content within 4hrs",
    target: 90,
    current: 23,
    trend: "UP",
    lastUpdated: "2025-03-15T09:30Z",
    unit: "%",
    status: "RED",
  },
];

export const mopMetrics: MOPMetric[] = [
  { id: "MOP-1", task: "MISO products disseminated", capability: "MISO", planned: 12, actual: 9, unit: "products", status: "AMBER" },
  { id: "MOP-2", task: "COMMANDO SOLO broadcast hours", capability: "EW", planned: 8, actual: 8, unit: "hours", status: "GREEN" },
  { id: "MOP-3", task: "Cyber DCO actions executed", capability: "CYBER", planned: 4, actual: 1, unit: "actions", status: "RED" },
  { id: "MOP-4", task: "PA press releases issued", capability: "PA", planned: 3, actual: 2, unit: "releases", status: "AMBER" },
  { id: "MOP-5", task: "SIGMAN compliance checks", capability: "OPSEC", planned: 6, actual: 6, unit: "checks", status: "GREEN" },
  { id: "MOP-6", task: "Deepfake takedown requests", capability: "MISO", planned: 15, actual: 3, unit: "requests", status: "RED" },
];

export const signatureItems: SignatureItem[] = [
  {
    id: "SIG-1",
    category: "TECHNICAL",
    description: "MIG C2 Node RF Emissions",
    riskLevel: "HIGH",
    currentValue: "18.4 dBm (ABOVE THRESHOLD)",
    threshold: "< 12 dBm",
    recommendation: "Reduce transmitter power; implement frequency-hopping protocol",
    exposureScore: 78,
  },
  {
    id: "SIG-2",
    category: "TECHNICAL",
    description: "Unencrypted Admin Traffic (Port 80)",
    riskLevel: "CRITICAL",
    currentValue: "DETECTED: 3 endpoints",
    threshold: "Zero tolerance",
    recommendation: "IMMEDIATE: Force HTTPS on all endpoints; audit ACLs",
    exposureScore: 95,
  },
  {
    id: "SIG-3",
    category: "ADMINISTRATIVE",
    description: "SIPR Traffic Volume Pattern",
    riskLevel: "MEDIUM",
    currentValue: "+340% above baseline (anomalous spike)",
    threshold: "< +50% baseline",
    recommendation: "Distribute traffic across time windows; use data compression",
    exposureScore: 62,
  },
  {
    id: "SIG-4",
    category: "PHYSICAL",
    description: "MIG Vehicle Movements (Kadena Gate 2)",
    riskLevel: "MEDIUM",
    currentValue: "12 vehicles/hr (predictable pattern)",
    threshold: "Randomize timing and routes",
    recommendation: "Implement randomized movement schedule; vary vehicle types",
    exposureScore: 55,
  },
  {
    id: "SIG-5",
    category: "ADMINISTRATIVE",
    description: "Social Media Posts by Unit Personnel",
    riskLevel: "HIGH",
    currentValue: "47 geo-tagged posts in AO (last 24hrs)",
    threshold: "Zero geo-tagged posts in AO",
    recommendation: "OPSEC briefing required; enforce social media policy",
    exposureScore: 81,
  },
  {
    id: "SIG-6",
    category: "TECHNICAL",
    description: "AI/ML Model Query Patterns",
    riskLevel: "LOW",
    currentValue: "Normal baseline",
    threshold: "< 5% anomaly rate",
    recommendation: "Monitor for data poisoning attempts; validate inputs",
    exposureScore: 22,
  },
];

export const threatEntities: ThreatEntity[] = [
  {
    id: "TE-001",
    designation: "APT41 / BARIUM (PRC MSS)",
    type: "STATE",
    location: "Cyberspace — attribution PRC MSS / Chengdu 404 Network Technology",
    grid: [75, 35],
    activity: "Coordinated IO / SIGINT collection / network intrusion",
    threat: "CRITICAL",
    confidence: 88,
    lastSeen: "2025-03-15T09:28Z",
    capabilities: ["CYBER", "SIGINT", "MISO", "DECEPTION"],
    sourceUrl: "https://attack.mitre.org/groups/G0096/",
    sourceLabel: "MITRE ATT&CK G0096",
  },
  {
    id: "TE-002",
    designation: "PRC SPAMOUFLAGE / DRAGONBRIDGE",
    type: "STATE",
    location: "PRC-directed — global social media platforms",
    grid: [48, 62],
    activity: "Coordinated inauthentic behavior; multi-platform influence operations targeting US audiences",
    threat: "HIGH",
    confidence: 71,
    lastSeen: "2025-03-15T07:55Z",
    capabilities: ["MISO", "SOCMINT"],
    sourceUrl: "https://www.justice.gov/opa/pr/justice-department-charges-individuals-covert-influence-campaign-targeting-united-states",
    sourceLabel: "DOJ Indictment (2023)",
  },
  {
    id: "TE-003",
    designation: "SALT TYPHOON (PRC APT)",
    type: "STATE",
    location: "Cyberspace — US telecom infrastructure",
    grid: [22, 28],
    activity: "Telecom network intrusion; ELINT/signals collection on US government targets",
    threat: "CRITICAL",
    confidence: 85,
    lastSeen: "2025-03-15T09:28Z",
    capabilities: ["CYBER", "SIGINT", "EW"],
    sourceUrl: "https://www.cisa.gov/news-events/alerts/2024/12/03/cisa-and-partners-release-joint-guidance-enhancing-visibility-prc-linked-cyber-threats",
    sourceLabel: "CISA Advisory Dec 2024",
  },
  {
    id: "TE-004",
    designation: "VOLT TYPHOON (PRC APT)",
    type: "STATE",
    location: "Cyberspace — US critical infrastructure / INDOPACOM networks",
    grid: [65, 45],
    activity: "Pre-positioning in critical infrastructure; living-off-the-land techniques; C2 botnet",
    threat: "CRITICAL",
    confidence: 85,
    lastSeen: "2025-03-15T09:03Z",
    capabilities: ["CYBER"],
    sourceUrl: "https://www.justice.gov/opa/pr/justice-department-conducts-court-authorized-operation-disrupt-botnet-used-peoples-republic",
    sourceLabel: "DOJ / FBI Jan 2024",
  },
];

export const narrativeThreads: NarrativeThread[] = [
  {
    id: "NT-1",
    title: "USMC 'Destabilization' Narrative",
    platform: "Telegram / WeChat / CGTN",
    sentiment: -0.82,
    reach: 48000000,
    velocity: 2400,
    adversarial: true,
    summary: "State-sponsored amplification claiming USMC Okinawa presence threatens regional stability and violates Ryukyuan sovereignty.",
    trend: "RISING",
  },
  {
    id: "NT-2",
    title: "Deepfake Commander Statement",
    platform: "WeChat / LINE / Twitter",
    sentiment: -0.94,
    reach: 8200000,
    velocity: 12000,
    adversarial: true,
    summary: "AI-generated video of USMC commander making inflammatory statements. Forensic analysis: 94% synthetic confidence.",
    trend: "RISING",
  },
  {
    id: "NT-3",
    title: "Alliance Partnership Narrative (Friendly)",
    platform: "Official USINDOPACOM / JDF channels",
    sentiment: 0.71,
    reach: 3100000,
    velocity: 180,
    adversarial: false,
    summary: "Friendly narrative emphasizing US-Japan alliance value, humanitarian assistance history, and shared security interests.",
    trend: "STABLE",
  },
  {
    id: "NT-4",
    title: "Environmental Damage Claims",
    platform: "Twitter / Reddit / Local JP Media",
    sentiment: -0.54,
    reach: 12400000,
    velocity: 890,
    adversarial: true,
    summary: "Coordinated amplification of environmental impact allegations against MCAS Futenma. Likely IO cell involvement.",
    trend: "RISING",
  },
];

export const runningEstimate: RunningEstimate = {
  classification: "SECRET//NOFORN",
  dtg: "151042Z MAR 25",
  operationName: "OPERATION PACIFIC SENTINEL",
  missionStatement: "1st MIG conducts Information Environment Operations in support of III MEF to counter adversary influence operations, protect friendly force information, and maintain IE superiority in the INDOPACOM AOR NLT D+7.",
  ieCondition: "HOSTILE",
  ieSituation: "The Information Environment within the AO is assessed HOSTILE. Adversary state-sponsored IO apparatus (IRON PANDA) has achieved temporary narrative superiority in the local population. Multiple simultaneous threat vectors active: deepfake video viral dissemination, coordinated bot amplification, EW collection, and APT41 network penetration. Adversary appears to be executing a pre-planned, synchronized multi-domain IO event timed to coincide with upcoming MEF exercise.",
  adversaryCapabilities: [
    "Coordinated inauthentic behavior (3,200+ bot accounts identified)",
    "AI-generated deepfake video production and distribution",
    "APT41 cyber intrusion capability targeting C2 infrastructure",
    "State media apparatus (CGTN/Global Times) with 48M+ reach",
    "ELINT/SIGINT collection platforms (Type-726) in AO",
    "Proxy IO facilitation network (SHADOW HERALD) in Okinawa",
  ],
  friendlyCapabilities: [
    "COMMANDO SOLO (EC-130J) — airborne broadcast (MISO/EW)",
    "MIG cyber DCO coordination with CYBERCOM",
    "PA office multilingual press capability",
    "NSA/CYBERCOM SIGINT/SOCMINT collection",
    "MISO product development and dissemination teams",
    "IO Planning Assistant: narrative analysis, MISO product generation, COA support",
  ],
  assumptions: [
    "Adversary IO campaign is coordinated with kinetic operations timeline",
    "Local population is susceptible to narrative influence (62% hostile sentiment baseline)",
    "CYBERCOM DCO authority obtainable within 4-6 hours of request",
    "Ally (JSDF) maintains coordinated IO response posture",
  ],
  limitations: [
    "All AI-assisted planning products require human analyst review before commander use",
    "EW actions require INDOPACOM deconfliction (JFC-IMC)",
    "Legal review required for all cyber offensive actions (Title 10/50)",
    "COMMANDO SOLO availability: 1 aircraft, 8-hour sortie limit",
  ],
  risks: [
    "RISK: Data poisoning of AI analytics feeds may corrupt COA recommendations — MITIGATE: Manual validation layer required",
    "RISK: Escalation — EW actions may trigger adversary response — MITIGATE: Coordinate with EW deconfliction cell",
    "RISK: PA counter-messaging may be outpaced by viral velocity — MITIGATE: Pre-position PA teams for rapid response",
  ],
  recommendations: [
    "IMMEDIATE: Execute COA-C (FULL SPECTRUM) — synchronized multi-capability IO response",
    "URGENT: Request CYBERCOM DCO authority for APT41 neutralization",
    "URGENT: PA press conference within 2 hours to address deepfake",
    "PRIORITY: SIGMAN lockdown — address unencrypted admin traffic (SIG-2) immediately",
    "SUSTAIN: Daily MOE/MOP review cycle; iterate within 24hr planning windows",
  ],
  cdruObjective: "Achieve and maintain Information Environment Superiority within the AO to enable uninterrupted execution of OPERATION PACIFIC SENTINEL and protect the operational narrative.",
  priority: "IE1",
};

export const historicalMoeData = Array.from({ length: 30 }, (_, i) => ({
  day: `D-${29 - i}`,
  hostileReach: Math.max(10, 20 + Math.random() * 25 + (i > 20 ? i - 20 : 0)),
  sentiment: Math.max(30, 55 - Math.random() * 10 - (i > 22 ? (i - 22) * 0.7 : 0)),
  adversaryActivity: Math.max(1, 3 + Math.random() * 5 + (i > 25 ? i - 25 : 0)),
}));
