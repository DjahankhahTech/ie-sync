// Mock data representing the IE operational environment

export type ThreatLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type SensorType = "SIGINT" | "OSINT" | "HUMINT" | "CYBER" | "ISR" | "SOCMINT";
export type IOCapability = "MISO" | "CYBER" | "EW" | "DECEPTION" | "OPSEC" | "MILDEC" | "PA";

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

export interface COAAuthority {
  authority: string;
  status: "OBTAINED" | "PENDING" | "NOT_REQUIRED";
  chain: string;
}

export interface COASecondOrderEffect {
  effect: string;
  likelihood: ThreatLevel;
  mitigation: string;
}

export interface COAIntelBasis {
  title: string;
  source: string;
  relevance: string;
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
  // Intelligence linkage
  targetedThreatEntities?: string[];
  targetedNarratives?: string[];
  linkedMOEs?: string[];
  // Detailed planning
  requiredAuthorities?: COAAuthority[];
  secondOrderEffects?: COASecondOrderEffect[];
  phaseAlignment?: string;
  // Intelligence basis
  intelligenceBasis?: COAIntelBasis[];
  counterNarrativeStrategy?: string;
  escalationRisk?: string;
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
  /** Real-world events/sources supporting this metric value */
  linkedEvents?: LinkedEvent[];
  /** National strategy alignment */
  strategyAlignment?: {
    nssObjective: string;
    ndsLine: string;
    cocomPriority: string;
    strategicNarrative: string;
  };
  /** OSINT collection sources feeding this metric */
  osintSources?: {
    name: string;
    type: "SOCMINT" | "GOVINT" | "ACADINT" | "TECHINT" | "MEDIAINT";
    feed: string;
    lastCollection: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    dataPoints: number;
  }[];
}

export interface LinkedEvent {
  title: string;
  source: string;
  url: string;
  relevance: string;
}

export interface MOPMetric {
  id: string;
  task: string;
  capability: IOCapability;
  planned: number;
  actual: number;
  unit: string;
  status: "GREEN" | "AMBER" | "RED";
  /** Real-world events/sources supporting this metric value */
  linkedEvents?: LinkedEvent[];
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
  sourceUrl?: string;
  sourceLabel?: string;
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

// ── IO Planner Builder Types ──────────────────────────────────────────────────

export type IOPlannerStep =
  | "target-audiences"
  | "desired-effects"
  | "messages-narratives"
  | "delivery-mechanisms"
  | "timing-sequencing"
  | "assessment-measures"
  | "risks-second-order"
  | "resources-authorities";

export interface TargetAudienceOption {
  id: string;
  name: string;
  category: "CIVILIAN" | "MILITARY" | "GOVERNMENT" | "MEDIA" | "DIASPORA";
  description: string;
  estimatedReach: string;
}

export interface DesiredEffectOption {
  id: string;
  verb: string;
  description: string;
  applicableTAs: string[];
}

export interface MessageNarrativeOption {
  id: string;
  theme: string;
  narrative: string;
  languages: string[];
  supportedEffects: string[];
}

export interface DeliveryMechanism {
  id: string;
  name: string;
  capability: IOCapability;
  platform: string;
  reach: string;
  latency: string;
}

export interface TimingPhase {
  id: string;
  phase: string;
  offsetHours: number;
  description: string;
}

export interface AssessmentMeasure {
  id: string;
  type: "MOE" | "MOP";
  name: string;
  metric: string;
  collectionMethod: string;
  frequency: string;
}

export interface RiskEntry {
  id: string;
  category: "ESCALATION" | "BLOWBACK" | "ATTRIBUTION" | "LEGAL" | "COALITION" | "COLLATERAL";
  description: string;
  likelihood: ThreatLevel;
  impact: ThreatLevel;
  mitigation: string;
}

export interface ResourceAuthority {
  id: string;
  type: "ASSET" | "AUTHORITY" | "PERSONNEL" | "FUNDING";
  name: string;
  status: "AVAILABLE" | "REQUESTED" | "PENDING" | "UNAVAILABLE";
  approvalChain: string;
}

export interface IOPlan {
  id: string;
  name: string;
  gccId: string;
  createdAt: string;
  targetAudiences: TargetAudienceOption[];
  desiredEffects: DesiredEffectOption[];
  messages: MessageNarrativeOption[];
  deliveryMechanisms: DeliveryMechanism[];
  timingPhases: TimingPhase[];
  assessmentMeasures: AssessmentMeasure[];
  risks: RiskEntry[];
  resources: ResourceAuthority[];
  generatedCOA: COAOption | null;
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
    sourceUrl: "https://attack.mitre.org/groups/G1015/",
    sourceLabel: "MITRE ATT&CK G1015",
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
    sourceUrl: "https://www.cisa.gov/resources-tools/resources/enhanced-visibility-and-hardening-guidance-communications-infrastructure",
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
    sourceUrl: "https://www.justice.gov/archives/opa/pr/us-government-disrupts-botnet-peoples-republic-china-used-conceal-hacking-critical",
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
