/**
 * ─────────────────────────────────────────────────────────────────────────────
 * METRIC CONTRACTS — MetricDefinition + MetricRun
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every metric displayed in IE-Sync MUST be backed by:
 *   1. A MetricDefinition  — the "contract" explaining what it is, how it's
 *      computed, its units/window/cadence/inputs, and known failure modes.
 *   2. One or more MetricRun records — timestamped computations with an
 *      evidence_refs[] trail so any analyst can drill into the raw evidence.
 *
 * Transparency requirements (per user specification):
 *   - Every tile shows: last_updated, window, confidence badge
 *   - ⓘ drawer shows the full MetricDefinition
 *   - Click → Metric Detail Panel shows trend, breakdown, top events, sample, confidence band
 *   - No "magic numbers" — if we can't explain it, we don't show it
 */

// ── MetricDefinition ─────────────────────────────────────────────────────────

export interface MetricInput {
  /** Human-readable name of this input (e.g. "DFRLab social media sample") */
  name: string;
  /** Origin system or organization */
  source: string;
  /** How fresh this input is (e.g. "≤15 min polling", "weekly survey") */
  freshness: string;
  /** URL or reference to the source methodology / system */
  reference?: string;
}

export interface MetricDefinition {
  /** Unique metric identifier — matches MOEMetric.id */
  metric_id: string;
  /** Short display name */
  name: string;
  /** One-paragraph plain-English definition: what does this measure? */
  definition: string;
  /** Mathematical formula or computation method (can be prose if qualitative) */
  formula: string;
  /** Display unit (e.g. "% reach", "index 0-100", "actions/day") */
  units: string;
  /** Measurement window (e.g. "rolling 24hr", "weekly snapshot") */
  window: string;
  /** How often this metric is recomputed */
  update_cadence: string;
  /** What data feeds into this metric */
  inputs: MetricInput[];
  /** Any pre-filters applied before computation */
  filters: string;
  /** How confidence is calculated (e.g. "sample size + source diversity") */
  confidence_method: string;
  /** Known failure modes — when does this metric lie? */
  known_failure_modes: string[];
  /** Responsible analyst / office */
  owner: string;
  /** ISO timestamp of last analyst validation of the definition itself */
  last_validated_at: string;
  /** Schema version for this definition */
  metric_version: string;
  /** JP 3-13 reference or doctrinal basis */
  doctrinal_basis: string;
  /** Direction: is lower or higher better? */
  direction: "higher_is_better" | "lower_is_better";
  /** Thresholds for status determination */
  thresholds: {
    green: string;
    amber: string;
    red: string;
  };
}

// ── MetricRun ────────────────────────────────────────────────────────────────

export interface EvidenceRef {
  /** Type of evidence */
  type: "feed_item" | "sensor_feed" | "analyst_report" | "external_source" | "platform_data";
  /** Reference ID or URL */
  ref_id: string;
  /** Short label */
  label: string;
  /** ISO timestamp of the evidence */
  timestamp: string;
  /** URL if externally linkable */
  url?: string;
}

export interface MetricRun {
  /** Which metric definition this run belongs to */
  metric_id: string;
  /** When this computation happened */
  computed_at: string;
  /** Window start (ISO) */
  window_start: string;
  /** Window end (ISO) */
  window_end: string;
  /** Computed value */
  value: number;
  /** Confidence level */
  confidence: "HIGH" | "MEDIUM" | "LOW";
  /** Hash of all inputs used (for reproducibility) */
  inputs_hash: string;
  /** JSON parameters used in computation */
  parameters_json: string;
  /** Evidence trail: the specific items that drove this value */
  evidence_refs: EvidenceRef[];
  /** Sample size (if applicable) */
  sample_size?: number;
  /** Confidence interval lower bound (if applicable) */
  ci_lower?: number;
  /** Confidence interval upper bound (if applicable) */
  ci_upper?: number;
}

// ── MetricTrend (for the Metric Detail Panel chart) ──────────────────────────

export interface MetricTrendPoint {
  timestamp: string;
  value: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

// ── MetricDriver (what's driving this metric) ────────────────────────────────

export interface MetricDriver {
  /** What is driving the metric value */
  label: string;
  /** Category of driver */
  category: "platform" | "narrative" | "entity" | "event" | "system";
  /** Impact: positive or negative contribution */
  impact: "positive" | "negative" | "neutral";
  /** Magnitude 0-100 */
  magnitude: number;
  /** Reference to evidence */
  evidence_ref?: EvidenceRef;
}

// ──────────────────────────────────────────────────────────────────────────────
// MetricDefinition registry — one per MOE across all GCCs
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Keyed by a "template ID" pattern:  MOE-{GCC_ABBR}-{N}
 * e.g. MOE-IP-1, MOE-CC-3, MOE-EU-5
 *
 * Because many GCCs share similar metric *types* (e.g. hostile narrative penetration)
 * but with AOR-specific inputs, each GCC gets its own definitions.
 */

const INDOPACOM_DEFINITIONS: MetricDefinition[] = [
  {
    metric_id: "MOE-IP-1",
    name: "Hostile Narrative Penetration",
    definition: "Measures the percentage of IO-relevant social media and broadcast content within the INDOPACOM AOR that is attributable to adversary (primarily PRC) influence operations. Denominator is total IO-relevant content sampled; numerator is content traced to adversary IO cells or state media (CGTN, Global Times, Xinhua IO products).",
    formula: "(adversary_io_content_impressions / total_io_relevant_content_impressions) × 100",
    units: "% reach",
    window: "Rolling 24-hour sample",
    update_cadence: "Every 1-3 hours (analyst-gated)",
    inputs: [
      { name: "DFRLab social media sample", source: "Atlantic Council DFRLab", freshness: "≤15 min polling", reference: "https://www.atlanticcouncil.org/programs/digital-forensic-research-lab/" },
      { name: "MEMRI media translation feed", source: "MEMRI", freshness: "≤1 hr", reference: "https://www.memri.org/" },
      { name: "Telegram channel monitoring", source: "INDOPACOM SOCMINT Cell", freshness: "≤15 min" },
      { name: "WeChat public account sampling", source: "DIA Social Analytics", freshness: "≤30 min" },
    ],
    filters: "Only content classified as IO-relevant by keyword match + analyst review. Excludes commercial/entertainment content.",
    confidence_method: "Based on (1) sample size ≥500 items, (2) ≥3 independent platform sources, (3) <6hr staleness. All three → HIGH; two → MEDIUM; one or fewer → LOW.",
    known_failure_modes: [
      "Keyword-only classification has ~15% false positive rate — no NLP/NER in place yet",
      "WeChat sampling is limited to public accounts; private groups excluded",
      "CGTN content may be double-counted if syndicated across multiple outlets",
      "Does not detect novel adversary IO tactics not in keyword list",
      "DFRLab feed outages (rare but possible) cause sample bias",
    ],
    owner: "INDOPACOM IO Cell / 1st MIG S3",
    last_validated_at: "2026-02-15T14:00:00Z",
    metric_version: "2.1",
    doctrinal_basis: "JP 3-13 §4-5 (MOE Framework); JP 3-13.2 (MISO Assessment)",
    direction: "lower_is_better",
    thresholds: { green: "≤15%", amber: "15-30%", red: ">30%" },
  },
  {
    metric_id: "MOE-IP-2",
    name: "Population Sentiment (Pro-USMC)",
    definition: "Measures the percentage of sampled local population (Okinawa/Guam focus) expressing neutral or favorable attitude toward US Marine Corps presence. Derived from allied liaison polling data, augmented by SOCMINT sentiment analysis.",
    formula: "(favorable_respondents + neutral_respondents) / total_respondents × 100",
    units: "%",
    window: "Weekly snapshot (rolling average of last 2 weeks)",
    update_cadence: "Weekly (liaison polling) / daily (SOCMINT proxy)",
    inputs: [
      { name: "JSDF community liaison surveys", source: "JSDF / III MEF Liaison", freshness: "Weekly" },
      { name: "SOCMINT sentiment proxy", source: "MEMRI / DFRLab", freshness: "≤1 hr" },
      { name: "Okinawa prefectural media tone analysis", source: "PA Office III MEF", freshness: "≤4 hr" },
    ],
    filters: "Survey limited to military-adjacent communities within 25km of USMC installations. SOCMINT excludes identified bot accounts.",
    confidence_method: "Survey sample ≥200 respondents → HIGH base; degraded if SOCMINT proxy diverges >10% from survey → MEDIUM; stale data (>14 days) → LOW.",
    known_failure_modes: [
      "Survey response bias: self-selection of respondents near bases",
      "SOCMINT sentiment analysis accuracy ~70% for Japanese-language content",
      "Adversary IO campaigns can temporarily inflate negative sentiment proxy",
      "Small survey sample sizes in Guam (n<50) reduce confidence",
    ],
    owner: "III MEF PA / INDOPACOM J5",
    last_validated_at: "2026-02-10T08:00:00Z",
    metric_version: "1.4",
    doctrinal_basis: "JP 3-13 §4-5; JP 3-29 (Foreign Humanitarian Assistance) sentiment baseline",
    direction: "higher_is_better",
    thresholds: { green: "≥50%", amber: "40-50%", red: "<40%" },
  },
  {
    metric_id: "MOE-IP-3",
    name: "Adversary IO Cell Activity",
    definition: "Daily count of analyst-attributed hostile information operations actions detected across INDOPACOM AOR. Actions include bot surges (>200% baseline), deepfake product drops, coordinated phishing campaigns targeting IO infrastructure, and identified state media synchronization events.",
    formula: "count(distinct analyst-attributed IO actions in 24hr window)",
    units: "actions/day",
    window: "Rolling 24 hours",
    update_cadence: "Every 1-3 hours",
    inputs: [
      { name: "CYBERCOM threat telemetry", source: "CYBERCOM Sentinel Feed", freshness: "≤15 min" },
      { name: "NSA SIGINT fusion", source: "NSA-TAO", freshness: "≤30 min" },
      { name: "SOCMINT anomaly detection", source: "DIA Social Analytics", freshness: "≤15 min" },
      { name: "Deepfake detection alerts", source: "DIA / Stanford IO Observatory", freshness: "≤1 hr" },
    ],
    filters: "Only actions with analyst confidence ≥60% attribution to adversary state/proxy. Excludes unattributed anomalies.",
    confidence_method: "≥3 independent detection sources for single event → HIGH; 2 sources → MEDIUM; single source → LOW.",
    known_failure_modes: [
      "Attribution confidence varies widely by action type (phishing easier than narrative ops)",
      "Novel TTPs not in detection playbook will be missed",
      "High event volume may overwhelm analyst capacity → undercounting",
      "SIGINT collection gaps during maintenance windows",
    ],
    owner: "INDOPACOM IO Cell / CYBERCOM Liaison",
    last_validated_at: "2026-02-18T16:00:00Z",
    metric_version: "2.0",
    doctrinal_basis: "JP 3-13 §4-5; JP 3-12 (Cyberspace Operations)",
    direction: "lower_is_better",
    thresholds: { green: "≤3/day", amber: "4-8/day", red: ">8/day" },
  },
  {
    metric_id: "MOE-IP-4",
    name: "Counter-Narrative Amplification",
    definition: "Ratio of friendly IO content impressions to hostile IO content impressions, expressed as a percentage. 200% = 2:1 parity target. Measures effectiveness of MISO product dissemination and PA counter-messaging relative to adversary output.",
    formula: "(friendly_io_impressions / hostile_io_impressions) × 100",
    units: "% ratio",
    window: "Rolling 24 hours",
    update_cadence: "Every 2-4 hours",
    inputs: [
      { name: "MISO product tracking", source: "1st MIG MISO Cell", freshness: "≤2 hr" },
      { name: "PA social media analytics", source: "USINDOPACOM PA", freshness: "≤1 hr" },
      { name: "SOCMINT impression sampling", source: "DFRLab / DIA", freshness: "≤30 min" },
    ],
    filters: "Only IO-relevant content; commercial/entertainment excluded. Friendly = official channels + verified ally content.",
    confidence_method: "Sample size ≥1000 content items across ≥3 platforms → HIGH; reduced sample or platform coverage → MEDIUM; single platform → LOW.",
    known_failure_modes: [
      "Impression counts from SOCMINT are estimates, not exact figures",
      "Friendly content from unofficial ally supporters may be miscategorized",
      "Adversary may operate under false-flag friendly accounts",
      "Platform API rate limits may reduce sampling completeness",
    ],
    owner: "1st MIG S3 / MISO Cell",
    last_validated_at: "2026-02-12T10:00:00Z",
    metric_version: "1.2",
    doctrinal_basis: "JP 3-13 §4-5; JP 3-13.2 (MISO)",
    direction: "higher_is_better",
    thresholds: { green: "≥200%", amber: "100-200%", red: "<100%" },
  },
  {
    metric_id: "MOE-IP-5",
    name: "Ally Confidence Index (Japan/Philippines)",
    definition: "Composite 0-100 index aggregating three sub-indices from JSDF and AFP liaison reporting: (1) operational trust score (weighted 40%), (2) information sharing cadence (weighted 30%), and (3) joint exercise participation rate (weighted 30%).",
    formula: "0.4 × operational_trust + 0.3 × info_sharing_cadence + 0.3 × exercise_participation",
    units: "index (0-100)",
    window: "Weekly reporting cycle",
    update_cadence: "Weekly",
    inputs: [
      { name: "JSDF liaison weekly report", source: "JSDF Combined Staff", freshness: "Weekly" },
      { name: "AFP liaison weekly report", source: "AFP J3/J5", freshness: "Weekly" },
      { name: "Exercise participation tracking", source: "INDOPACOM J7", freshness: "After each exercise" },
    ],
    filters: "Limited to JSDF and AFP reporting. Does not include other INDOPACOM allies (ROK, AUS, etc.) in this version.",
    confidence_method: "Both ally reports received on time → HIGH; one stale (>10 days) → MEDIUM; both stale → LOW.",
    known_failure_modes: [
      "Self-reporting bias from ally liaison offices",
      "Index weights (40/30/30) are analyst-chosen, not empirically validated",
      "Exercise cancellations (weather, logistics) artificially depress the score",
      "Limited to two allies — not representative of full AOR partnership health",
    ],
    owner: "INDOPACOM J5 / III MEF G5",
    last_validated_at: "2026-02-08T12:00:00Z",
    metric_version: "1.1",
    doctrinal_basis: "JP 3-16 (Multinational Operations); JP 3-13 §4-5",
    direction: "higher_is_better",
    thresholds: { green: "≥70", amber: "50-70", red: "<50" },
  },
  {
    metric_id: "MOE-IP-6",
    name: "Deepfake Takedown Rate",
    definition: "Percentage of analyst-flagged deepfake/synthetic media items that are successfully removed from hosting platforms within the 4-hour SLA. 'Removed' means platform confirms content is no longer accessible via original URL.",
    formula: "(confirmed_takedowns_within_4hr / total_flagged_deepfakes) × 100",
    units: "%",
    window: "Rolling 24 hours",
    update_cadence: "Hourly (automated tracking)",
    inputs: [
      { name: "DIA Social Analytics deepfake flags", source: "DIA", freshness: "≤15 min" },
      { name: "CYBERCOM DCO takedown logs", source: "CYBERCOM", freshness: "≤30 min" },
      { name: "Platform removal confirmation", source: "Platform API responses", freshness: "≤1 hr" },
      { name: "Stanford IO Observatory synthetic media detection", source: "Stanford", freshness: "≤2 hr", reference: "https://io.stanford.edu/" },
    ],
    filters: "Only items with ≥90% synthetic confidence per forensic analysis. Manual analyst flag required.",
    confidence_method: "≥10 flagged items in window + platform confirmation loop closed → HIGH; <10 items or partial platform response → MEDIUM; <3 items → LOW (sample too small).",
    known_failure_modes: [
      "Platform response time varies (Telegram rarely removes; Meta faster)",
      "Re-uploads and mirrors are not tracked in this metric",
      "4-hour SLA may be unrealistic for platforms with slow moderation",
      "Detection limited to known synthetic media patterns — novel techniques may evade",
    ],
    owner: "1st MIG IO Cell / CYBERCOM DCO Liaison",
    last_validated_at: "2026-02-20T09:00:00Z",
    metric_version: "2.3",
    doctrinal_basis: "JP 3-13 §4-5; CYBERCOM DCO SOP",
    direction: "higher_is_better",
    thresholds: { green: "≥90%", amber: "50-90%", red: "<50%" },
  },
];

// ── Template definitions for other GCCs (abbreviated for commonly measured metrics) ──

const CENTCOM_DEFINITIONS: MetricDefinition[] = [
  {
    metric_id: "MOE-CC-1",
    name: "Anti-US Narrative Penetration (ME)",
    definition: "Measures IRGC/Houthi/Hezbollah content as a percentage of sampled Arabic-language media impression share across the CENTCOM AOR. Baselines derived from MEMRI and BBC Monitoring Arabic media surveys.",
    formula: "(hostile_io_impressions / total_arabic_media_sample) × 100",
    units: "% reach",
    window: "Rolling 24 hours",
    update_cadence: "Every 2-4 hours",
    inputs: [
      { name: "MEMRI Arabic media translations", source: "MEMRI", freshness: "≤1 hr", reference: "https://www.memri.org/" },
      { name: "BBC Monitoring Arabic service", source: "BBC Monitoring", freshness: "≤2 hr" },
      { name: "CENTCOM SOCMINT Cell", source: "CENTCOM J39", freshness: "≤30 min" },
    ],
    filters: "IO-relevant content only. Excludes entertainment, sports, and commercial Arabic media.",
    confidence_method: "Sample ≥300 items from ≥3 platform types → HIGH; 2 platforms or <300 items → MEDIUM; single source → LOW.",
    known_failure_modes: [
      "Arabic NLP sentiment has ~68% accuracy — lower than English",
      "MEMRI translation lag can miss rapidly evolving narratives",
      "Proxy media (PMF-aligned outlets) may not be attributed to IRGC",
      "BBC Monitoring does not cover all Gulf social media platforms",
    ],
    owner: "CENTCOM J39 IO Cell",
    last_validated_at: "2026-02-14T11:00:00Z",
    metric_version: "1.8",
    doctrinal_basis: "JP 3-13 §4-5; JP 3-13.2 (MISO Assessment)",
    direction: "lower_is_better",
    thresholds: { green: "≤20%", amber: "20-35%", red: ">35%" },
  },
  {
    metric_id: "MOE-CC-2",
    name: "Regional Public Sentiment (Pro-Coalition)",
    definition: "Percentage of GCC partner state populations expressing favorable attitude toward US military presence, derived from partner nation liaison polling.",
    formula: "(favorable_respondents / total_respondents) × 100",
    units: "%",
    window: "Weekly snapshot",
    update_cadence: "Weekly",
    inputs: [
      { name: "UAE/KSA/Jordan liaison surveys", source: "CENTCOM J5 Partner Liaison", freshness: "Weekly" },
      { name: "SOCMINT sentiment proxy", source: "CENTCOM SOCMINT Cell", freshness: "≤4 hr" },
    ],
    filters: "Survey limited to partner nation military-adjacent populations. SOCMINT limited to public Arabic-language accounts.",
    confidence_method: "Survey sample ≥150 per country → HIGH; <150 → MEDIUM; stale (>14 days) → LOW.",
    known_failure_modes: ["Self-selection bias", "Government-influenced responses in authoritarian partners", "Small sample sizes in some partners"],
    owner: "CENTCOM J5",
    last_validated_at: "2026-02-10T09:00:00Z",
    metric_version: "1.3",
    doctrinal_basis: "JP 3-13 §4-5",
    direction: "higher_is_better",
    thresholds: { green: "≥45%", amber: "30-45%", red: "<30%" },
  },
  {
    metric_id: "MOE-CC-3",
    name: "APT33 Intrusion Attempts",
    definition: "Daily count of APT33-attributed intrusion attempts against CENTCOM networks, confirmed via TTPs matching MITRE ATT&CK Group G0064.",
    formula: "count(APT33-attributed intrusion attempts in 24hr window)",
    units: "attempts/day",
    window: "Rolling 24 hours",
    update_cadence: "Hourly",
    inputs: [
      { name: "CYBERCOM/CENTCOM CERT logs", source: "CYBERCOM", freshness: "≤15 min" },
      { name: "MITRE ATT&CK TTP correlation", source: "MITRE", freshness: "Reference DB", reference: "https://attack.mitre.org/groups/G0064/" },
    ],
    filters: "Only confirmed APT33 TTP matches. Excludes generic intrusion noise.",
    confidence_method: "≥3 TTP indicators matched → HIGH; 2 → MEDIUM; 1 → LOW.",
    known_failure_modes: ["Novel TTPs not in ATT&CK DB", "False negatives from encrypted C2", "Attribution lag for new infrastructure"],
    owner: "CENTCOM CERT / CYBERCOM Liaison",
    last_validated_at: "2026-02-19T15:00:00Z",
    metric_version: "2.0",
    doctrinal_basis: "JP 3-12 (Cyberspace Operations); JP 3-13 §4-5",
    direction: "lower_is_better",
    thresholds: { green: "≤5/day", amber: "5-15/day", red: ">15/day" },
  },
  {
    metric_id: "MOE-CC-4",
    name: "Partner Nation IO Coordination",
    definition: "Percentage of GCC partner IO staffs operating under active coordinated messaging agreement with shared assessment cycle.",
    formula: "(coordinated_partners / total_gcc_partners) × 100",
    units: "% aligned",
    window: "Monthly assessment",
    update_cadence: "Weekly",
    inputs: [
      { name: "CENTCOM J7 partner tracking", source: "CENTCOM J7", freshness: "Weekly" },
    ],
    filters: "Active GCC partners only (UAE, KSA, Jordan, Bahrain, Kuwait, Qatar, Oman).",
    confidence_method: "Direct liaison confirmation → HIGH; email-only → MEDIUM; no recent contact → LOW.",
    known_failure_modes: ["Partners may agree in principle but not execute", "Bilateral agreements may not include all GCC members"],
    owner: "CENTCOM J7",
    last_validated_at: "2026-02-11T08:00:00Z",
    metric_version: "1.0",
    doctrinal_basis: "JP 3-16 (Multinational Operations)",
    direction: "higher_is_better",
    thresholds: { green: "≥80%", amber: "50-80%", red: "<50%" },
  },
  {
    metric_id: "MOE-CC-5",
    name: "Houthi Narrative Velocity",
    definition: "Posts per hour across Houthi-attributed Telegram channels and pro-IRGC accounts. Spike detection threshold per Stanford Internet Observatory methodology.",
    formula: "count(posts in Houthi-attributed channels per hour)",
    units: "posts/hr",
    window: "Real-time (1-hour rolling)",
    update_cadence: "Every 15 minutes",
    inputs: [
      { name: "CENTCOM SOCMINT Telegram monitoring", source: "CENTCOM SOCMINT Cell", freshness: "≤15 min" },
      { name: "Stanford IO Observatory methodology", source: "Stanford", freshness: "Reference", reference: "https://io.stanford.edu/" },
    ],
    filters: "Only channels with confirmed Houthi/IRGC attribution per analyst review.",
    confidence_method: "≥50 channels monitored → HIGH; 20-50 → MEDIUM; <20 → LOW.",
    known_failure_modes: ["New channels not yet attributed", "VPN/encrypted channels not monitored", "Platform API throttling during surges"],
    owner: "CENTCOM SOCMINT Cell",
    last_validated_at: "2026-02-17T12:00:00Z",
    metric_version: "1.5",
    doctrinal_basis: "JP 3-13 §4-5; Stanford IO Methodology",
    direction: "lower_is_better",
    thresholds: { green: "≤500/hr", amber: "500-2000/hr", red: ">2000/hr" },
  },
  {
    metric_id: "MOE-CC-6",
    name: "Coalition Maritime Narrative Support",
    definition: "Percentage of sampled Arabic/Farsi media articles characterizing Red Sea coalition operations as legitimate or defensive.",
    formula: "(favorable_articles / total_sampled_articles) × 100",
    units: "%",
    window: "Weekly",
    update_cadence: "Weekly",
    inputs: [
      { name: "BBC Monitoring Arabic/Farsi service", source: "BBC Monitoring", freshness: "≤2 hr" },
      { name: "MEMRI translations", source: "MEMRI", freshness: "≤4 hr" },
      { name: "CENTCOM PA media tracking", source: "CENTCOM PA", freshness: "≤8 hr" },
    ],
    filters: "Only articles directly referencing Red Sea/Bab el-Mandeb operations.",
    confidence_method: "Sample ≥100 articles from ≥5 outlets → HIGH; fewer → MEDIUM.",
    known_failure_modes: ["Translation accuracy", "Outlet bias not weighted", "Government-controlled media may not reflect public opinion"],
    owner: "CENTCOM PA / J39",
    last_validated_at: "2026-02-09T14:00:00Z",
    metric_version: "1.1",
    doctrinal_basis: "JP 3-13 §4-5",
    direction: "higher_is_better",
    thresholds: { green: "≥60%", amber: "40-60%", red: "<40%" },
  },
];

// ── Simplified definitions for EUCOM / AFRICOM / SOUTHCOM / NORTHCOM ────────
// (Each follows the same MetricDefinition schema — abbreviated for file size)

const EUCOM_DEFINITIONS: MetricDefinition[] = [
  { metric_id: "MOE-EU-1", name: "Russian Narrative Penetration (EU)", definition: "RT/Sputnik content as % of sampled EU-language media. Post-ban measurement via VPN-accessible mirrors and proxy outlets.", formula: "(russian_io_impressions / total_eu_media_sample) × 100", units: "% reach", window: "Rolling 24 hours", update_cadence: "Every 2-4 hours", inputs: [{ name: "EUvsDisinfo database", source: "EU EEAS", freshness: "≤4 hr", reference: "https://euvsdisinfo.eu/" }, { name: "DFRLab monitoring", source: "DFRLab", freshness: "≤1 hr" }, { name: "NATO StratCom COE analysis", source: "NATO StratCom COE", freshness: "≤8 hr" }], filters: "IO-relevant content only. Post-EU-ban RT/Sputnik content measured via VPN-accessible mirrors.", confidence_method: "≥3 independent EU media sources → HIGH; 2 → MEDIUM; 1 → LOW.", known_failure_modes: ["Post-ban RT content harder to track", "Mirror sites change frequently", "EU language diversity limits sampling"], owner: "EUCOM J39 / NATO StratCom COE", last_validated_at: "2026-02-13T10:00:00Z", metric_version: "2.0", doctrinal_basis: "JP 3-13 §4-5; NATO StratCom COE Methodology", direction: "lower_is_better", thresholds: { green: "≤10%", amber: "10-25%", red: ">25%" } },
  { metric_id: "MOE-EU-2", name: "Baltic Population NATO Support", definition: "% of Estonian/Latvian/Lithuanian respondents supporting NATO membership per quarterly survey.", formula: "(pro_nato_respondents / total_respondents) × 100", units: "%", window: "Quarterly", update_cadence: "Quarterly (proxy: monthly SOCMINT)", inputs: [{ name: "Baltic Defence College survey", source: "BDC", freshness: "Quarterly" }], filters: "Representative sample of 18+ citizens in Baltic states.", confidence_method: "Survey sample ≥1000 per country → HIGH.", known_failure_modes: ["Quarterly lag", "Sampling bias in rural areas"], owner: "EUCOM J5 / BDC", last_validated_at: "2026-01-15T10:00:00Z", metric_version: "1.0", doctrinal_basis: "JP 3-13 §4-5", direction: "higher_is_better", thresholds: { green: "≥70%", amber: "55-70%", red: "<55%" } },
  { metric_id: "MOE-EU-3", name: "APT28/GRU Intrusion Attempts", definition: "Daily APT28-attributed intrusion attempts against EUCOM networks per MITRE ATT&CK G0007 TTPs.", formula: "count(APT28 intrusion attempts / 24hr)", units: "attempts/day", window: "Rolling 24 hours", update_cadence: "Hourly", inputs: [{ name: "CYBERCOM/EUCOM CERT", source: "CYBERCOM", freshness: "≤15 min" }], filters: "Confirmed APT28 TTPs only.", confidence_method: "≥3 TTP indicators → HIGH.", known_failure_modes: ["Novel TTPs", "False negatives"], owner: "EUCOM CERT", last_validated_at: "2026-02-18T14:00:00Z", metric_version: "1.8", doctrinal_basis: "JP 3-12; JP 3-13 §4-5", direction: "lower_is_better", thresholds: { green: "≤4/day", amber: "4-12/day", red: ">12/day" } },
  { metric_id: "MOE-EU-4", name: "Ukrainian IO Coordination Score", definition: "Composite score of US-Ukraine IO synchronization: messaging alignment, shared targeting, and assessment frequency.", formula: "0.4 × messaging_alignment + 0.3 × shared_targeting + 0.3 × assessment_frequency", units: "index (0-100)", window: "Weekly", update_cadence: "Weekly", inputs: [{ name: "EUCOM J39/Ukraine SO liaison", source: "EUCOM J39", freshness: "Weekly" }], filters: "Active coordination channels only.", confidence_method: "Both liaison reports → HIGH.", known_failure_modes: ["Self-reporting", "Operational tempo may reduce coordination quality"], owner: "EUCOM J39", last_validated_at: "2026-02-12T08:00:00Z", metric_version: "1.0", doctrinal_basis: "JP 3-13 §4-5", direction: "higher_is_better", thresholds: { green: "≥75", amber: "50-75", red: "<50" } },
  { metric_id: "MOE-EU-5", name: "Wagner Disinformation Velocity (Africa/EU)", definition: "Posts/hr across Wagner-attributed Telegram/VK channels targeting EU and African audiences.", formula: "count(Wagner-attributed posts per hour)", units: "posts/hr", window: "1-hour rolling", update_cadence: "Every 15 minutes", inputs: [{ name: "DFRLab Wagner tracking", source: "DFRLab", freshness: "≤15 min" }], filters: "Analyst-attributed Wagner/Prigozhin network channels.", confidence_method: "≥30 channels → HIGH.", known_failure_modes: ["Wagner rebranding post-Prigozhin", "New channel attribution lag"], owner: "EUCOM J39", last_validated_at: "2026-02-16T09:00:00Z", metric_version: "1.3", doctrinal_basis: "JP 3-13 §4-5", direction: "lower_is_better", thresholds: { green: "≤200/hr", amber: "200-800/hr", red: ">800/hr" } },
  { metric_id: "MOE-EU-6", name: "NATO eFP Host Nation Confidence", definition: "Host nation public confidence in NATO Enhanced Forward Presence, measured by Allied survey.", formula: "(confident_respondents / total) × 100", units: "%", window: "Monthly", update_cadence: "Monthly", inputs: [{ name: "NATO PA survey", source: "NATO PA", freshness: "Monthly" }], filters: "eFP host nations (Estonia, Latvia, Lithuania, Poland).", confidence_method: "Survey received on time → HIGH.", known_failure_modes: ["Survey fatigue", "Seasonal variation"], owner: "NATO StratCom COE", last_validated_at: "2026-01-20T12:00:00Z", metric_version: "1.0", doctrinal_basis: "JP 3-13 §4-5; NATO StratCom", direction: "higher_is_better", thresholds: { green: "≥65%", amber: "45-65%", red: "<45%" } },
];

const AFRICOM_DEFINITIONS: MetricDefinition[] = [
  { metric_id: "MOE-AF-1", name: "Wagner IO Penetration (Sahel)", definition: "Wagner-attributed content as % of sampled Sahel social media and FM radio. Measured via DFRLab and Africa Center for Strategic Studies.", formula: "(wagner_io_content / total_sample) × 100", units: "% reach", window: "Rolling 24 hours", update_cadence: "Every 4-8 hours", inputs: [{ name: "DFRLab Wagner Africa monitoring", source: "DFRLab", freshness: "≤2 hr" }, { name: "ACSS media analysis", source: "Africa Center for Strategic Studies", freshness: "≤8 hr" }], filters: "Sahel region only (Mali, Niger, Burkina Faso, Chad).", confidence_method: "≥2 independent sources → HIGH.", known_failure_modes: ["FM radio monitoring limited", "Wagner rebranding", "Local language gaps"], owner: "AFRICOM J39", last_validated_at: "2026-02-14T08:00:00Z", metric_version: "1.5", doctrinal_basis: "JP 3-13 §4-5", direction: "lower_is_better", thresholds: { green: "≤15%", amber: "15-30%", red: ">30%" } },
  { metric_id: "MOE-AF-2", name: "Partner Force Trust Index", definition: "Composite trust index from African partner force liaison reporting.", formula: "avg(partner_trust_scores)", units: "index (0-100)", window: "Monthly", update_cadence: "Monthly", inputs: [{ name: "AFRICOM J5 partner liaison reports", source: "AFRICOM J5", freshness: "Monthly" }], filters: "Active partner forces only.", confidence_method: "≥3 partner reports → HIGH.", known_failure_modes: ["Self-reporting bias", "Coup-affected partners excluded"], owner: "AFRICOM J5", last_validated_at: "2026-02-10T10:00:00Z", metric_version: "1.0", doctrinal_basis: "JP 3-13 §4-5", direction: "higher_is_better", thresholds: { green: "≥60", amber: "40-60", red: "<40" } },
  { metric_id: "MOE-AF-3", name: "VEO Recruitment Narrative Velocity", definition: "Posts/hr across al-Shabaab/Boko Haram/JNIM recruitment channels.", formula: "count(veo_recruitment_posts / hour)", units: "posts/hr", window: "1-hour rolling", update_cadence: "Every 30 minutes", inputs: [{ name: "AFRICOM SOCMINT Cell", source: "AFRICOM J39", freshness: "≤30 min" }], filters: "Confirmed VEO recruitment channels only.", confidence_method: "≥20 channels → HIGH.", known_failure_modes: ["Channel migration", "Encrypted platforms"], owner: "AFRICOM J39", last_validated_at: "2026-02-17T11:00:00Z", metric_version: "1.2", doctrinal_basis: "JP 3-13 §4-5", direction: "lower_is_better", thresholds: { green: "≤100/hr", amber: "100-500/hr", red: ">500/hr" } },
  { metric_id: "MOE-AF-4", name: "Counter-Narrative Reach (Sahel)", definition: "Ratio of friendly IO impressions to hostile in Sahel region.", formula: "(friendly_impressions / hostile_impressions) × 100", units: "% ratio", window: "Rolling 24 hours", update_cadence: "Every 4 hours", inputs: [{ name: "AFRICOM MISO tracking", source: "AFRICOM J39", freshness: "≤4 hr" }], filters: "Sahel region, IO-relevant content.", confidence_method: "Sample ≥500 → HIGH.", known_failure_modes: ["Limited internet penetration", "Radio content hard to measure"], owner: "AFRICOM J39", last_validated_at: "2026-02-11T09:00:00Z", metric_version: "1.0", doctrinal_basis: "JP 3-13 §4-5", direction: "higher_is_better", thresholds: { green: "≥150%", amber: "80-150%", red: "<80%" } },
  { metric_id: "MOE-AF-5", name: "Chinese Influence Penetration (Africa)", definition: "PRC-attributed IO content as % of sampled African media.", formula: "(prc_io_content / total_sample) × 100", units: "% reach", window: "Rolling 48 hours", update_cadence: "Daily", inputs: [{ name: "DFRLab China-Africa monitoring", source: "DFRLab", freshness: "≤4 hr" }], filters: "PRC state media and IO-attributed content.", confidence_method: "Multi-source → HIGH.", known_failure_modes: ["PRC influence often through investment, not media — undercounted"], owner: "AFRICOM J39", last_validated_at: "2026-02-13T14:00:00Z", metric_version: "1.1", doctrinal_basis: "JP 3-13 §4-5", direction: "lower_is_better", thresholds: { green: "≤10%", amber: "10-20%", red: ">20%" } },
  { metric_id: "MOE-AF-6", name: "Coup Narrative Early Warning", definition: "Composite score of coup-related narrative indicators across monitored Sahel platforms.", formula: "weighted_sum(coup_narrative_indicators)", units: "index (0-100)", window: "Rolling 72 hours", update_cadence: "Every 6 hours", inputs: [{ name: "AFRICOM J2 analysis", source: "AFRICOM J2", freshness: "≤6 hr" }], filters: "Sahel/West Africa focus.", confidence_method: "Multiple indicators → HIGH.", known_failure_modes: ["Novel coup indicators", "Information vacuum in restricted media environments"], owner: "AFRICOM J2/J39", last_validated_at: "2026-02-15T10:00:00Z", metric_version: "1.0", doctrinal_basis: "JP 3-13 §4-5", direction: "lower_is_better", thresholds: { green: "≤30", amber: "30-60", red: ">60" } },
];

const SOUTHCOM_DEFINITIONS: MetricDefinition[] = [
  { metric_id: "MOE-SC-1", name: "Venezuelan State Media Reach", definition: "Venezuelan/Cuban state media IO content as % of sampled Spanish-language media in SOUTHCOM AOR.", formula: "(state_media_io / total_sample) × 100", units: "% reach", window: "Rolling 24 hours", update_cadence: "Every 4 hours", inputs: [{ name: "SOUTHCOM SOCMINT", source: "SOUTHCOM J39", freshness: "≤2 hr" }], filters: "Spanish-language IO-relevant content.", confidence_method: "Multi-platform → HIGH.", known_failure_modes: ["Venezuelan media consolidation", "Cuban content hard to sample"], owner: "SOUTHCOM J39", last_validated_at: "2026-02-12T08:00:00Z", metric_version: "1.3", doctrinal_basis: "JP 3-13 §4-5", direction: "lower_is_better", thresholds: { green: "≤12%", amber: "12-25%", red: ">25%" } },
  { metric_id: "MOE-SC-2", name: "Partner Nation Sentiment (Pro-US)", definition: "% of population in key SOUTHCOM partners expressing favorable attitude toward US partnership.", formula: "(favorable / total) × 100", units: "%", window: "Monthly", update_cadence: "Monthly", inputs: [{ name: "SOUTHCOM J5 polling", source: "SOUTHCOM J5", freshness: "Monthly" }], filters: "Colombia, Brazil, Ecuador, Peru focus.", confidence_method: "Survey sample ≥200 per country → HIGH.", known_failure_modes: ["Political instability affects survey access", "Anti-US sentiment may be underreported"], owner: "SOUTHCOM J5", last_validated_at: "2026-02-09T10:00:00Z", metric_version: "1.0", doctrinal_basis: "JP 3-13 §4-5", direction: "higher_is_better", thresholds: { green: "≥55%", amber: "40-55%", red: "<40%" } },
  { metric_id: "MOE-SC-3", name: "Narco-IO Activity Level", definition: "Count of narco-trafficking organization IO actions (social media threats, journalist intimidation events, disinformation campaigns) per week.", formula: "count(narco_io_actions / week)", units: "actions/wk", window: "Weekly", update_cadence: "Daily", inputs: [{ name: "InSight Crime monitoring", source: "InSight Crime", freshness: "≤24 hr", reference: "https://insightcrime.org/" }, { name: "SOUTHCOM J2 reporting", source: "SOUTHCOM J2", freshness: "≤12 hr" }], filters: "Analyst-attributed narco-IO only.", confidence_method: "Multi-source corroboration → HIGH.", known_failure_modes: ["Underreporting of journalist intimidation", "Attribution difficulty"], owner: "SOUTHCOM J2/J39", last_validated_at: "2026-02-16T09:00:00Z", metric_version: "1.2", doctrinal_basis: "JP 3-13 §4-5", direction: "lower_is_better", thresholds: { green: "≤5/wk", amber: "5-15/wk", red: ">15/wk" } },
  { metric_id: "MOE-SC-4", name: "Counter-Narcotics Messaging Reach", definition: "Friendly counter-narcotics IO content impressions as ratio to cartel propaganda.", formula: "(friendly_cn_impressions / cartel_propaganda) × 100", units: "% ratio", window: "Rolling 48 hours", update_cadence: "Every 8 hours", inputs: [{ name: "SOUTHCOM MISO tracking", source: "SOUTHCOM J39", freshness: "≤8 hr" }], filters: "Counter-narcotics themed content.", confidence_method: "Sample ≥200 → HIGH.", known_failure_modes: ["Cartel media operates on platforms hard to monitor", "Encrypted messaging prevalence"], owner: "SOUTHCOM J39", last_validated_at: "2026-02-11T11:00:00Z", metric_version: "1.0", doctrinal_basis: "JP 3-13 §4-5", direction: "higher_is_better", thresholds: { green: "≥180%", amber: "100-180%", red: "<100%" } },
  { metric_id: "MOE-SC-5", name: "Chinese Influence Ops (LATAM)", definition: "PRC-attributed IO content as % of sampled Spanish-language regional media.", formula: "(prc_io / total_sample) × 100", units: "% reach", window: "Rolling 48 hours", update_cadence: "Daily", inputs: [{ name: "DFRLab LATAM monitoring", source: "DFRLab", freshness: "≤4 hr" }], filters: "PRC state media and IO-attributed content in LATAM.", confidence_method: "Multi-source → HIGH.", known_failure_modes: ["PRC influence through investment narratives harder to detect", "Local proxy outlets"], owner: "SOUTHCOM J39", last_validated_at: "2026-02-14T09:00:00Z", metric_version: "1.1", doctrinal_basis: "JP 3-13 §4-5", direction: "lower_is_better", thresholds: { green: "≤8%", amber: "8-18%", red: ">18%" } },
  { metric_id: "MOE-SC-6", name: "Migration Narrative Control", definition: "% of migration-related media coverage aligned with US policy messaging vs adversary framing.", formula: "(us_aligned_coverage / total_migration_coverage) × 100", units: "%", window: "Weekly", update_cadence: "Weekly", inputs: [{ name: "SOUTHCOM PA tracking", source: "SOUTHCOM PA", freshness: "≤24 hr" }], filters: "Migration-related coverage in SOUTHCOM AOR.", confidence_method: "≥50 articles → HIGH.", known_failure_modes: ["Migration narratives highly polarized domestically", "Difficult to distinguish adversary from organic criticism"], owner: "SOUTHCOM PA/J39", last_validated_at: "2026-02-10T08:00:00Z", metric_version: "1.0", doctrinal_basis: "JP 3-13 §4-5", direction: "higher_is_better", thresholds: { green: "≥50%", amber: "30-50%", red: "<30%" } },
];

const NORTHCOM_DEFINITIONS: MetricDefinition[] = [
  { metric_id: "MOE-NC-1", name: "Foreign Election Interference Indicators", definition: "Composite index of detected foreign influence operations targeting US elections. Combines SOCMINT bot detection, CISA threat advisories, and FBI counterintelligence reporting.", formula: "weighted_sum(election_interference_indicators)", units: "index (0-100)", window: "Rolling 7 days", update_cadence: "Daily", inputs: [{ name: "FBI CI reporting", source: "FBI", freshness: "≤24 hr" }, { name: "CISA threat advisories", source: "CISA", freshness: "≤4 hr", reference: "https://www.cisa.gov/" }, { name: "Meta CIB reports", source: "Meta Transparency", freshness: "≤48 hr" }], filters: "Foreign-attributed activities only. Excludes domestic political activity.", confidence_method: "Multi-agency corroboration → HIGH.", known_failure_modes: ["Attribution lag", "Domestic/foreign distinction challenging", "Novel platforms"], owner: "NORTHCOM / FBI FTTTF", last_validated_at: "2026-02-20T10:00:00Z", metric_version: "2.0", doctrinal_basis: "JP 3-13 §4-5; EO 13848", direction: "lower_is_better", thresholds: { green: "≤20", amber: "20-50", red: ">50" } },
  { metric_id: "MOE-NC-2", name: "Critical Infrastructure Cyber Resilience", definition: "% of critical infrastructure sectors reporting no active APT compromise per CISA assessment.", formula: "(uncompromised_sectors / total_sectors) × 100", units: "%", window: "Monthly", update_cadence: "Monthly", inputs: [{ name: "CISA sector assessments", source: "CISA", freshness: "Monthly" }], filters: "16 critical infrastructure sectors per PPD-21.", confidence_method: "Full sector reporting → HIGH.", known_failure_modes: ["Self-reporting by sector leads", "Unknown compromises"], owner: "NORTHCOM / CISA", last_validated_at: "2026-02-15T12:00:00Z", metric_version: "1.5", doctrinal_basis: "JP 3-12; PPD-21", direction: "higher_is_better", thresholds: { green: "≥87%", amber: "70-87%", red: "<70%" } },
  { metric_id: "MOE-NC-3", name: "Domestic Disinformation Velocity", definition: "Foreign-attributed disinformation posts/hr targeting US audiences across major platforms.", formula: "count(foreign_disinfo_posts / hour)", units: "posts/hr", window: "1-hour rolling", update_cadence: "Every 15 minutes", inputs: [{ name: "Meta CIB detection", source: "Meta", freshness: "≤1 hr" }, { name: "Stanford IO Observatory", source: "Stanford", freshness: "≤2 hr" }], filters: "Foreign-attributed only per FBI/Meta/Stanford.", confidence_method: "Multi-platform detection → HIGH.", known_failure_modes: ["Attribution difficulty for sophisticated operations", "Platform cooperation varies"], owner: "FBI FTTTF / NORTHCOM J39", last_validated_at: "2026-02-19T09:00:00Z", metric_version: "1.8", doctrinal_basis: "JP 3-13 §4-5", direction: "lower_is_better", thresholds: { green: "≤300/hr", amber: "300-1000/hr", red: ">1000/hr" } },
  { metric_id: "MOE-NC-4", name: "PRC Espionage Incident Rate", definition: "Monthly count of PRC-attributed espionage incidents against US government and defense targets.", formula: "count(prc_espionage_incidents / month)", units: "incidents/mo", window: "Monthly", update_cadence: "Weekly", inputs: [{ name: "FBI CI Division", source: "FBI", freshness: "≤7 days" }, { name: "DOJ indictments", source: "DOJ", freshness: "As issued", reference: "https://www.justice.gov/" }], filters: "PRC-attributed only per FBI/DOJ.", confidence_method: "FBI confirmation → HIGH.", known_failure_modes: ["Long attribution timelines", "Many incidents unreported"], owner: "FBI CI / NORTHCOM J2", last_validated_at: "2026-02-18T14:00:00Z", metric_version: "1.3", doctrinal_basis: "JP 3-13 §4-5; EO 13694", direction: "lower_is_better", thresholds: { green: "≤3/mo", amber: "3-8/mo", red: ">8/mo" } },
  { metric_id: "MOE-NC-5", name: "Allied Homeland Defense Coordination", definition: "Composite score of US-Canada-Mexico security coordination on IO/cyber threats.", formula: "0.4 × info_sharing + 0.3 × exercise_participation + 0.3 × threat_response_time", units: "index (0-100)", window: "Monthly", update_cadence: "Monthly", inputs: [{ name: "NORTHCOM J5 reporting", source: "NORTHCOM J5", freshness: "Monthly" }], filters: "NORAD/NORTHCOM bilateral channels.", confidence_method: "All partners reporting → HIGH.", known_failure_modes: ["Political sensitivities", "Mexico cooperation varies"], owner: "NORTHCOM J5", last_validated_at: "2026-02-12T10:00:00Z", metric_version: "1.0", doctrinal_basis: "JP 3-13 §4-5; NORAD Agreement", direction: "higher_is_better", thresholds: { green: "≥70", amber: "50-70", red: "<50" } },
  { metric_id: "MOE-NC-6", name: "Domestic Extremism IO Indicators", definition: "Composite index of domestic extremist groups' online IO activity potentially influenced by foreign actors.", formula: "weighted_sum(domestic_extremism_io_indicators)", units: "index (0-100)", window: "Rolling 7 days", update_cadence: "Daily", inputs: [{ name: "FBI DT reporting", source: "FBI", freshness: "≤24 hr" }, { name: "DHS I&A", source: "DHS", freshness: "≤24 hr" }], filters: "Only foreign-influenced domestic activity per FBI/DHS.", confidence_method: "Multi-agency → HIGH.", known_failure_modes: ["Foreign influence on domestic groups hard to establish", "Civil liberties constraints"], owner: "FBI / DHS I&A", last_validated_at: "2026-02-20T08:00:00Z", metric_version: "1.5", doctrinal_basis: "JP 3-13 §4-5; DHS NTAS", direction: "lower_is_better", thresholds: { green: "≤25", amber: "25-55", red: ">55" } },
];

// ── Public API: look up definitions by metric_id ─────────────────────────────

const ALL_DEFINITIONS: MetricDefinition[] = [
  ...INDOPACOM_DEFINITIONS,
  ...CENTCOM_DEFINITIONS,
  ...EUCOM_DEFINITIONS,
  ...AFRICOM_DEFINITIONS,
  ...SOUTHCOM_DEFINITIONS,
  ...NORTHCOM_DEFINITIONS,
];

const DEFINITION_MAP = new Map<string, MetricDefinition>();
for (const def of ALL_DEFINITIONS) {
  DEFINITION_MAP.set(def.metric_id, def);
}

/** Look up the full MetricDefinition for a given metric_id */
export function getMetricDefinition(metricId: string): MetricDefinition | null {
  return DEFINITION_MAP.get(metricId) ?? null;
}

/** Get all definitions for a GCC prefix (e.g. "IP" → INDOPACOM) */
export function getDefinitionsForGCC(gccPrefix: string): MetricDefinition[] {
  return ALL_DEFINITIONS.filter((d) => d.metric_id.includes(`-${gccPrefix}-`));
}

// ── Mock MetricRun generator ─────────────────────────────────────────────────
// In production this would come from a database. For now we generate synthetic
// MetricRun records from the existing MOEMetric data.

export function generateMetricRun(
  metricId: string,
  currentValue: number,
  lastUpdated: string,
): MetricRun {
  const def = getMetricDefinition(metricId);
  const now = lastUpdated || new Date().toISOString();
  const windowEnd = new Date(now);
  const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000); // 24hr default

  // Generate synthetic evidence refs based on the metric's inputs
  const evidenceRefs: EvidenceRef[] = (def?.inputs ?? []).slice(0, 3).map((input, i) => ({
    type: "external_source" as const,
    ref_id: `${metricId}-evidence-${i}`,
    label: `${input.source}: ${input.name}`,
    timestamp: new Date(windowEnd.getTime() - (i + 1) * 3600000).toISOString(),
    url: input.reference,
  }));

  // Determine confidence from definition method
  const confidence: MetricRun["confidence"] =
    evidenceRefs.length >= 3 ? "HIGH" : evidenceRefs.length >= 2 ? "MEDIUM" : "LOW";

  return {
    metric_id: metricId,
    computed_at: now,
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
    value: currentValue,
    confidence,
    inputs_hash: btoa(`${metricId}-${currentValue}-${now}`).slice(0, 16),
    parameters_json: JSON.stringify({ window: "24hr", source_count: evidenceRefs.length }),
    evidence_refs: evidenceRefs,
    sample_size: Math.floor(200 + Math.random() * 800),
    ci_lower: Math.max(0, currentValue - (5 + Math.random() * 10)),
    ci_upper: currentValue + (5 + Math.random() * 10),
  };
}

// ── Mock trend data generator ────────────────────────────────────────────────

export function generateMetricTrend(
  metricId: string,
  currentValue: number,
  trend: "UP" | "DOWN" | "STABLE",
  points: number = 14,
): MetricTrendPoint[] {
  const result: MetricTrendPoint[] = [];
  const now = Date.now();

  for (let i = points - 1; i >= 0; i--) {
    const timestamp = new Date(now - i * 6 * 3600000).toISOString(); // 6hr intervals
    // Generate a plausible historical value based on trend
    const noise = (Math.random() - 0.5) * currentValue * 0.15;
    let trendOffset: number;
    if (trend === "UP") {
      trendOffset = (points - 1 - i) * (currentValue * 0.03);
    } else if (trend === "DOWN") {
      trendOffset = -(points - 1 - i) * (currentValue * 0.03);
    } else {
      trendOffset = 0;
    }
    const value = Math.max(0, currentValue - trendOffset + noise);

    result.push({
      timestamp,
      value: Math.round(value * 100) / 100,
      confidence: i > points * 0.7 ? "LOW" : i > points * 0.3 ? "MEDIUM" : "HIGH",
    });
  }

  return result;
}

// ── Mock drivers generator ───────────────────────────────────────────────────

export function generateMetricDrivers(metricId: string): MetricDriver[] {
  const def = getMetricDefinition(metricId);
  if (!def) return [];

  // Generate plausible drivers based on the metric's inputs
  const drivers: MetricDriver[] = [];

  if (def.direction === "lower_is_better") {
    // For metrics where lower is better, drivers are things pushing the value up (negative) or down (positive)
    drivers.push(
      { label: def.inputs[0]?.source ?? "Primary source", category: "platform", impact: "negative", magnitude: 65, evidence_ref: { type: "external_source", ref_id: `${metricId}-driver-0`, label: def.inputs[0]?.name ?? "Primary data", timestamp: new Date().toISOString() } },
      { label: "Adversary campaign escalation", category: "entity", impact: "negative", magnitude: 45 },
      { label: "Counter-narrative operations", category: "narrative", impact: "positive", magnitude: 30 },
    );
  } else {
    drivers.push(
      { label: def.inputs[0]?.source ?? "Primary source", category: "platform", impact: "positive", magnitude: 55, evidence_ref: { type: "external_source", ref_id: `${metricId}-driver-0`, label: def.inputs[0]?.name ?? "Primary data", timestamp: new Date().toISOString() } },
      { label: "MISO product dissemination", category: "narrative", impact: "positive", magnitude: 40 },
      { label: "Adversary counter-operations", category: "entity", impact: "negative", magnitude: 35 },
    );
  }

  return drivers;
}
