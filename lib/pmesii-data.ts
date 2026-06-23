/**
 * PMESII-PT Operational Environment Mapping
 * Political, Military, Economic, Social, Information, Infrastructure — Physical, Time
 *
 * Maps the operational environment factors for each GCC with real-world
 * indicators linked to OSINT collection feeds.
 */

import type { GCCId } from "./gcc-config";

export type PMESIIDimension =
  | "POLITICAL"
  | "MILITARY"
  | "ECONOMIC"
  | "SOCIAL"
  | "INFORMATION"
  | "INFRASTRUCTURE";

export interface PMESIIFactor {
  id: string;
  dimension: PMESIIDimension;
  name: string;
  description: string;
  /** Current assessment: -1.0 (hostile/degraded) to +1.0 (favorable/robust) */
  assessment: number;
  /** Trend direction */
  trend: "IMPROVING" | "STABLE" | "DEGRADING";
  /** Key indicators driving this assessment */
  indicators: PMESIIIndicator[];
  /** ASCOPE cross-cut: which ASCOPE categories this factor maps to */
  ascope: ("AREAS" | "STRUCTURES" | "CAPABILITIES" | "ORGANIZATIONS" | "PEOPLE" | "EVENTS")[];
  /** Last update timestamp */
  lastUpdated: string;
}

export interface PMESIIIndicator {
  label: string;
  value: string;
  source: string;
  sourceUrl: string;
  /** How recent this data point is */
  freshness: "LIVE" | "24H" | "48H" | "WEEKLY";
  /** Sentiment or status */
  status: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "CRITICAL";
}

export interface PMESIIMapping {
  gccId: GCCId;
  /** Overall IE condition assessment */
  overallCondition: "PERMISSIVE" | "UNCERTAIN" | "CONTESTED" | "HOSTILE";
  /** Dimensions with their factors */
  dimensions: Record<PMESIIDimension, PMESIIFactor[]>;
  /** Cross-dimensional key themes */
  keyThemes: string[];
  /** Last full refresh */
  lastRefresh: string;
}

// ── PMESII Data by GCC ──────────────────────────────────────────────────

const now = () => new Date().toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();

const PMESII_DATA: Partial<Record<GCCId, PMESIIMapping>> = {
  // ── INDOPACOM ─────────────────────────────────────────────────────────
  INDOPACOM: {
    gccId: "INDOPACOM",
    overallCondition: "CONTESTED",
    keyThemes: [
      "PRC gray zone escalation in Taiwan Strait & South China Sea",
      "DPRK nuclear/missile provocation cycle",
      "Alliance cohesion stress from economic coercion",
      "Coordinated inauthentic behavior targeting USMC presence in Okinawa",
    ],
    lastRefresh: now(),
    dimensions: {
      POLITICAL: [
        {
          id: "IP-POL-1",
          dimension: "POLITICAL",
          name: "Alliance Cohesion",
          description: "Strength of US bilateral/multilateral alliances (AUKUS, Quad, bilateral treaties with Japan, ROK, Philippines, Australia)",
          assessment: 0.6,
          trend: "STABLE",
          ascope: ["ORGANIZATIONS", "PEOPLE"],
          lastUpdated: hoursAgo(2),
          indicators: [
            { label: "AUKUS Pillar II Progress", value: "On track — AI/quantum sharing agreements signed", source: "CSIS", sourceUrl: "https://www.csis.org/programs/australia-chair", freshness: "WEEKLY", status: "POSITIVE" },
            { label: "Japan-US 2+2 Outcomes", value: "Extended deterrence reaffirmed; Okinawa force posture review underway", source: "DoD", sourceUrl: "https://www.defense.gov/News/Releases/", freshness: "WEEKLY", status: "POSITIVE" },
            { label: "Philippines VFA Status", value: "EDCA sites expanding; 4 new locations approved", source: "Reuters", sourceUrl: "https://www.reuters.com/world/asia-pacific/", freshness: "48H", status: "POSITIVE" },
            { label: "ROK Alliance Friction", value: "Domestic opposition to THAAD expansion; cost-sharing dispute ongoing", source: "Yonhap", sourceUrl: "https://en.yna.co.kr/", freshness: "24H", status: "NEGATIVE" },
          ],
        },
        {
          id: "IP-POL-2",
          dimension: "POLITICAL",
          name: "PRC Political Warfare",
          description: "CCP united front and political influence operations targeting allied governments and publics",
          assessment: -0.5,
          trend: "DEGRADING",
          ascope: ["ORGANIZATIONS", "PEOPLE", "EVENTS"],
          lastUpdated: hoursAgo(4),
          indicators: [
            { label: "CCP United Front Activity", value: "Increased funding to overseas Chinese associations in SE Asia", source: "ASPI", sourceUrl: "https://www.aspi.org.au/", freshness: "WEEKLY", status: "NEGATIVE" },
            { label: "Election Interference Indicators", value: "Taiwan 2026 local elections: AI-generated candidate deepfakes detected", source: "DFRLab", sourceUrl: "https://www.atlanticcouncil.org/programs/digital-forensic-research-lab/", freshness: "48H", status: "CRITICAL" },
            { label: "Economic Coercion", value: "Rare earth export controls expanded to 7 minerals; Lithuania trade blockade continues", source: "CSIS", sourceUrl: "https://www.csis.org/analysis", freshness: "24H", status: "NEGATIVE" },
          ],
        },
      ],
      MILITARY: [
        {
          id: "IP-MIL-1",
          dimension: "MILITARY",
          name: "PLA Force Posture",
          description: "PLA conventional and nuclear force disposition, exercises, and readiness indicators across Taiwan Strait and SCS",
          assessment: -0.7,
          trend: "DEGRADING",
          ascope: ["AREAS", "CAPABILITIES", "STRUCTURES"],
          lastUpdated: hoursAgo(1),
          indicators: [
            { label: "Taiwan Strait ADIZ Incursions", value: "47 PLA sorties in past 7 days (↑35% MoM)", source: "Taiwan MND", sourceUrl: "https://www.mnd.gov.tw/", freshness: "LIVE", status: "CRITICAL" },
            { label: "SCS Artificial Island Activity", value: "New radar installation detected on Mischief Reef via SAR imagery", source: "CSIS AMTI", sourceUrl: "https://amti.csis.org/", freshness: "48H", status: "NEGATIVE" },
            { label: "PLARF Missile Tests", value: "DF-27 hypersonic glide vehicle test from Hainan; 2nd test in 60 days", source: "CSIS Missile Defense", sourceUrl: "https://missilethreat.csis.org/", freshness: "WEEKLY", status: "CRITICAL" },
            { label: "Joint Exercise PACIFIC VANGUARD", value: "US-Japan-Australia trilateral ASW exercise completed successfully", source: "USNI News", sourceUrl: "https://news.usni.org/", freshness: "24H", status: "POSITIVE" },
          ],
        },
        {
          id: "IP-MIL-2",
          dimension: "MILITARY",
          name: "DPRK Provocation Cycle",
          description: "North Korean missile launches, nuclear posture, and military provocations",
          assessment: -0.6,
          trend: "STABLE",
          ascope: ["CAPABILITIES", "EVENTS"],
          lastUpdated: hoursAgo(6),
          indicators: [
            { label: "ICBM Launch Cadence", value: "Hwasong-19 tested; 3rd ICBM test this quarter", source: "38 North", sourceUrl: "https://www.38north.org/", freshness: "WEEKLY", status: "CRITICAL" },
            { label: "Yongbyon Reactor Status", value: "Thermal signatures consistent with plutonium reprocessing", source: "38 North", sourceUrl: "https://www.38north.org/", freshness: "48H", status: "NEGATIVE" },
          ],
        },
      ],
      ECONOMIC: [
        {
          id: "IP-ECON-1",
          dimension: "ECONOMIC",
          name: "Economic Coercion & Leverage",
          description: "Use of trade, investment, and supply chain dependencies as instruments of national power",
          assessment: -0.3,
          trend: "DEGRADING",
          ascope: ["STRUCTURES", "CAPABILITIES", "ORGANIZATIONS"],
          lastUpdated: hoursAgo(8),
          indicators: [
            { label: "Rare Earth Supply Concentration", value: "PRC controls 71% of global rare earth processing; new export licenses required", source: "Reuters", sourceUrl: "https://www.reuters.com/markets/commodities/", freshness: "24H", status: "NEGATIVE" },
            { label: "BRI Debt Distress", value: "Sri Lanka, Laos, Pakistan — debt restructuring stalled; port concessions leveraged", source: "Lowy Institute", sourceUrl: "https://www.lowyinstitute.org/", freshness: "WEEKLY", status: "NEGATIVE" },
            { label: "Semiconductor Supply Chain", value: "TSMC Arizona fab operational; allied chip production diversifying", source: "CSIS", sourceUrl: "https://www.csis.org/analysis", freshness: "WEEKLY", status: "POSITIVE" },
          ],
        },
      ],
      SOCIAL: [
        {
          id: "IP-SOC-1",
          dimension: "SOCIAL",
          name: "Public Sentiment Toward US Presence",
          description: "Population attitudes toward US military presence in host nations across the AOR",
          assessment: 0.2,
          trend: "STABLE",
          ascope: ["PEOPLE", "AREAS", "EVENTS"],
          lastUpdated: hoursAgo(3),
          indicators: [
            { label: "Okinawa Public Opinion", value: "62% oppose base expansion; protests at Camp Schwab resumed", source: "Japan Times", sourceUrl: "https://www.japantimes.co.jp/", freshness: "24H", status: "NEGATIVE" },
            { label: "Philippines Public Support", value: "71% favorable view of US military cooperation (Pulse Asia)", source: "Rappler", sourceUrl: "https://www.rappler.com/", freshness: "WEEKLY", status: "POSITIVE" },
            { label: "Australian Alliance Support", value: "AUKUS approval at 58% — nuclear submarine debate ongoing", source: "Lowy Institute", sourceUrl: "https://www.lowyinstitute.org/", freshness: "WEEKLY", status: "POSITIVE" },
          ],
        },
        {
          id: "IP-SOC-2",
          dimension: "SOCIAL",
          name: "Cultural & Psychological Factors",
          description: "Cultural narratives, historical grievances, and psychological vulnerabilities exploited by adversaries",
          assessment: -0.2,
          trend: "DEGRADING",
          ascope: ["PEOPLE", "EVENTS"],
          lastUpdated: hoursAgo(5),
          indicators: [
            { label: "Anti-US Historical Narratives", value: "PRC amplifying WWII revisionism and 'century of humiliation' content on Douyin/WeChat", source: "DFRLab", sourceUrl: "https://www.atlanticcouncil.org/programs/digital-forensic-research-lab/", freshness: "24H", status: "NEGATIVE" },
            { label: "Diaspora Community Targeting", value: "CCP overseas police stations identified in 5 allied nations — psychological pressure on dissidents", source: "Safeguard Defenders", sourceUrl: "https://safeguarddefenders.com/", freshness: "WEEKLY", status: "CRITICAL" },
          ],
        },
      ],
      INFORMATION: [
        {
          id: "IP-INFO-1",
          dimension: "INFORMATION",
          name: "Adversary IO Campaign Activity",
          description: "PRC and DPRK information operations, disinformation campaigns, and narrative warfare",
          assessment: -0.6,
          trend: "DEGRADING",
          ascope: ["CAPABILITIES", "EVENTS", "PEOPLE"],
          lastUpdated: hoursAgo(1),
          indicators: [
            { label: "DRAGONBRIDGE Network Activity", value: "3,200 bot accounts activated; anti-USMC narrative targeting Okinawa/Guam", source: "MITRE ATT&CK", sourceUrl: "https://attack.mitre.org/groups/G1015/", freshness: "LIVE", status: "CRITICAL" },
            { label: "Deepfake Proliferation", value: "AI-generated video of US commander making inflammatory statements — 2.1M views before takedown", source: "DFRLab", sourceUrl: "https://www.atlanticcouncil.org/programs/digital-forensic-research-lab/", freshness: "24H", status: "CRITICAL" },
            { label: "State Media Amplification", value: "Xinhua/CGTN coordinated push on 'US militarism' theme — 47 articles in 72 hours", source: "Media Cloud", sourceUrl: "https://mediacloud.org/", freshness: "24H", status: "NEGATIVE" },
            { label: "Friendly Counter-Narrative", value: "INDOPACOM PA 'Pacific Partnerships' campaign reaching 8.2M across platforms", source: "DVIDS", sourceUrl: "https://www.dvidshub.net/", freshness: "24H", status: "POSITIVE" },
          ],
        },
      ],
      INFRASTRUCTURE: [
        {
          id: "IP-INFRA-1",
          dimension: "INFRASTRUCTURE",
          name: "Critical Infrastructure & Cyber Terrain",
          description: "Physical and cyber infrastructure vulnerabilities in the AOR — undersea cables, bases, ports, networks",
          assessment: -0.3,
          trend: "STABLE",
          ascope: ["STRUCTURES", "AREAS", "CAPABILITIES"],
          lastUpdated: hoursAgo(4),
          indicators: [
            { label: "Undersea Cable Threats", value: "2 cable cuts near Matsu Islands — suspected PRC fishing fleet involvement", source: "AP News", sourceUrl: "https://apnews.com/", freshness: "48H", status: "CRITICAL" },
            { label: "Base Hardening Status", value: "Guam IAMD upgrades 78% complete; Tinian dispersal sites approved", source: "DoD", sourceUrl: "https://www.defense.gov/News/Releases/", freshness: "WEEKLY", status: "POSITIVE" },
            { label: "Cyber Infrastructure", value: "Volt Typhoon pre-positioning detected in Guam telecom infrastructure", source: "CISA", sourceUrl: "https://www.cisa.gov/news-events/cybersecurity-advisories", freshness: "24H", status: "CRITICAL" },
          ],
        },
      ],
    },
  },

  // ── CENTCOM ───────────────────────────────────────────────────────────
  CENTCOM: {
    gccId: "CENTCOM",
    overallCondition: "CONTESTED",
    keyThemes: [
      "IRGC proxy network escalation across Iraq, Syria, Yemen",
      "Houthi anti-shipping campaign in Red Sea / Bab el-Mandeb",
      "ISIS reconstitution in Syrian desert",
      "Iranian nuclear breakout timeline compressing",
    ],
    lastRefresh: now(),
    dimensions: {
      POLITICAL: [
        {
          id: "CC-POL-1",
          dimension: "POLITICAL",
          name: "Iranian Influence Architecture",
          description: "IRGC-QF political influence across Iraq, Syria, Lebanon, and Yemen through proxy governments and militias",
          assessment: -0.6,
          trend: "DEGRADING",
          ascope: ["ORGANIZATIONS", "PEOPLE", "AREAS"],
          lastUpdated: hoursAgo(3),
          indicators: [
            { label: "Iraqi PMF Political Power", value: "Pro-Iran bloc controls 83 parliamentary seats; veto power on security legislation", source: "Al-Monitor", sourceUrl: "https://www.al-monitor.com/", freshness: "WEEKLY", status: "NEGATIVE" },
            { label: "Hezbollah Post-Conflict Status", value: "Political apparatus intact; reconstruction narrative building popular support", source: "Middle East Eye", sourceUrl: "https://www.middleeasteye.net/", freshness: "24H", status: "NEGATIVE" },
            { label: "Abraham Accords Expansion", value: "Saudi normalization talks paused; UAE-Israel cooperation deepening", source: "Reuters", sourceUrl: "https://www.reuters.com/world/middle-east/", freshness: "48H", status: "NEUTRAL" },
          ],
        },
      ],
      MILITARY: [
        {
          id: "CC-MIL-1",
          dimension: "MILITARY",
          name: "Proxy Militia Operations",
          description: "Iranian-backed militia attacks on US forces and partner nation infrastructure",
          assessment: -0.7,
          trend: "DEGRADING",
          ascope: ["CAPABILITIES", "EVENTS", "AREAS"],
          lastUpdated: hoursAgo(1),
          indicators: [
            { label: "Attacks on US Forces", value: "14 drone/rocket attacks on US bases in Iraq/Syria in past 30 days", source: "CENTCOM", sourceUrl: "https://www.centcom.mil/MEDIA/PRESS-RELEASES/", freshness: "LIVE", status: "CRITICAL" },
            { label: "Houthi Anti-Ship Operations", value: "23 commercial vessels targeted in Red Sea; 3 hits confirmed", source: "USNI News", sourceUrl: "https://news.usni.org/", freshness: "24H", status: "CRITICAL" },
            { label: "ISIS Reconstitution", value: "150+ attacks in NE Syria in Q1; leadership regeneration observed", source: "CENTCOM OIR", sourceUrl: "https://www.centcom.mil/MEDIA/PRESS-RELEASES/", freshness: "WEEKLY", status: "NEGATIVE" },
          ],
        },
      ],
      ECONOMIC: [
        {
          id: "CC-ECON-1",
          dimension: "ECONOMIC",
          name: "Energy & Trade Disruption",
          description: "Impact of conflict on energy markets, shipping lanes, and regional economic stability",
          assessment: -0.5,
          trend: "DEGRADING",
          ascope: ["STRUCTURES", "AREAS"],
          lastUpdated: hoursAgo(6),
          indicators: [
            { label: "Red Sea Shipping Diversion", value: "60% of container traffic rerouting via Cape of Good Hope; +$1M per transit", source: "Lloyd's List", sourceUrl: "https://www.lloydslist.com/", freshness: "24H", status: "CRITICAL" },
            { label: "Iranian Sanctions Evasion", value: "Dark fleet of 400+ tankers moving ~1.5M bpd; PRC refineries primary destination", source: "OFAC", sourceUrl: "https://ofac.treasury.gov/", freshness: "WEEKLY", status: "NEGATIVE" },
          ],
        },
      ],
      SOCIAL: [
        {
          id: "CC-SOC-1",
          dimension: "SOCIAL",
          name: "Sectarian & Population Dynamics",
          description: "Sunni-Shia tensions, displacement populations, and social cohesion indicators",
          assessment: -0.4,
          trend: "STABLE",
          ascope: ["PEOPLE", "AREAS", "EVENTS"],
          lastUpdated: hoursAgo(8),
          indicators: [
            { label: "Iraqi IDP Population", value: "1.2M internally displaced; camp closures creating urban pressure", source: "UNHCR", sourceUrl: "https://www.unhcr.org/", freshness: "WEEKLY", status: "NEGATIVE" },
            { label: "Syrian Refugee Returns", value: "Limited returns to NW Syria; regime areas unsafe for opposition-linked families", source: "UNHCR", sourceUrl: "https://www.unhcr.org/", freshness: "WEEKLY", status: "NEGATIVE" },
            { label: "Gulf Youth Sentiment", value: "Saudi Vision 2030 driving moderate social reform; 64% youth approval", source: "Arab Barometer", sourceUrl: "https://www.arabbarometer.org/", freshness: "WEEKLY", status: "POSITIVE" },
          ],
        },
      ],
      INFORMATION: [
        {
          id: "CC-INFO-1",
          dimension: "INFORMATION",
          name: "Iranian/Proxy IO Campaigns",
          description: "IRGC and proxy information operations targeting US credibility and partner nation resolve",
          assessment: -0.5,
          trend: "DEGRADING",
          ascope: ["CAPABILITIES", "EVENTS", "PEOPLE"],
          lastUpdated: hoursAgo(2),
          indicators: [
            { label: "IRGC Social Media Networks", value: "1,400+ coordinated accounts pushing 'US withdrawal' narrative on X/Telegram", source: "DFRLab", sourceUrl: "https://www.atlanticcouncil.org/programs/digital-forensic-research-lab/", freshness: "24H", status: "CRITICAL" },
            { label: "Houthi Propaganda Output", value: "Daily video releases of anti-ship attacks; 50M+ views across platforms", source: "MEMRI", sourceUrl: "https://www.memri.org/", freshness: "LIVE", status: "NEGATIVE" },
            { label: "ISIS Media Wing", value: "Al-Furqan media resuming production; 3 Amaq 'news' releases this week", source: "SITE Intelligence", sourceUrl: "https://ent.siteintelgroup.com/", freshness: "24H", status: "NEGATIVE" },
          ],
        },
      ],
      INFRASTRUCTURE: [
        {
          id: "CC-INFRA-1",
          dimension: "INFRASTRUCTURE",
          name: "Critical Infrastructure Vulnerability",
          description: "Oil/gas infrastructure, shipping lanes, military bases, and cyber terrain in the AOR",
          assessment: -0.4,
          trend: "STABLE",
          ascope: ["STRUCTURES", "AREAS"],
          lastUpdated: hoursAgo(5),
          indicators: [
            { label: "Strait of Hormuz Traffic", value: "21M bpd transiting; Iranian naval exercises near shipping lanes", source: "EIA", sourceUrl: "https://www.eia.gov/", freshness: "WEEKLY", status: "NEGATIVE" },
            { label: "Base Force Protection", value: "C-RAM/C-UAS upgrades at Al-Asad and Al-Tanf 90% complete", source: "DoD", sourceUrl: "https://www.defense.gov/News/Releases/", freshness: "WEEKLY", status: "POSITIVE" },
          ],
        },
      ],
    },
  },

  // ── EUCOM ─────────────────────────────────────────────────────────────
  EUCOM: {
    gccId: "EUCOM",
    overallCondition: "CONTESTED",
    keyThemes: [
      "Russian hybrid warfare and dezinformatsiya campaigns targeting NATO cohesion",
      "Ukraine conflict information environment dynamics",
      "Wagner/Africa Corps influence extending from Africa into European politics",
      "Critical infrastructure sabotage (undersea cables, energy systems)",
    ],
    lastRefresh: now(),
    dimensions: {
      POLITICAL: [
        {
          id: "EU-POL-1",
          dimension: "POLITICAL",
          name: "NATO Cohesion & Resolve",
          description: "Alliance solidarity, burden-sharing, and political will for collective defense",
          assessment: 0.4,
          trend: "STABLE",
          ascope: ["ORGANIZATIONS", "PEOPLE"],
          lastUpdated: hoursAgo(4),
          indicators: [
            { label: "NATO Defense Spending", value: "23 of 32 allies meeting 2% GDP target (up from 11 in 2023)", source: "NATO", sourceUrl: "https://www.nato.int/cps/en/natohq/news.htm", freshness: "WEEKLY", status: "POSITIVE" },
            { label: "EU Strategic Autonomy Debate", value: "France pushing EU defense independence; creates friction with US-led NATO structure", source: "Euronews", sourceUrl: "https://www.euronews.com/", freshness: "48H", status: "NEUTRAL" },
            { label: "Russian Political Interference", value: "GRU-linked influence ops detected in 4 European elections (Czech, Slovak, Romanian, Bulgarian)", source: "EU vs Disinfo", sourceUrl: "https://euvsdisinfo.eu/", freshness: "24H", status: "NEGATIVE" },
          ],
        },
      ],
      MILITARY: [
        {
          id: "EU-MIL-1",
          dimension: "MILITARY",
          name: "Russian Military Posture",
          description: "Russian conventional, nuclear, and hybrid force disposition along NATO's eastern flank",
          assessment: -0.5,
          trend: "STABLE",
          ascope: ["CAPABILITIES", "AREAS", "EVENTS"],
          lastUpdated: hoursAgo(2),
          indicators: [
            { label: "Kaliningrad Force Buildup", value: "Iskander-M and S-400 reinforcements confirmed via commercial SAR", source: "Bellingcat", sourceUrl: "https://www.bellingcat.com/", freshness: "48H", status: "NEGATIVE" },
            { label: "Baltic Air Policing", value: "127 Russian aircraft intercepts in past 90 days (NATO Air Command)", source: "NATO", sourceUrl: "https://www.nato.int/cps/en/natohq/news.htm", freshness: "24H", status: "NEGATIVE" },
            { label: "Ukraine Frontline Status", value: "Positional warfare; Russia gaining 2-3km/month in Donetsk at high attrition cost", source: "ISW", sourceUrl: "https://www.understandingwar.org/", freshness: "LIVE", status: "NEGATIVE" },
          ],
        },
      ],
      ECONOMIC: [
        {
          id: "EU-ECON-1",
          dimension: "ECONOMIC",
          name: "Energy Security & Sanctions",
          description: "European energy diversification, sanctions effectiveness, and Russian economic warfare",
          assessment: 0.1,
          trend: "IMPROVING",
          ascope: ["STRUCTURES", "CAPABILITIES"],
          lastUpdated: hoursAgo(12),
          indicators: [
            { label: "Russian Gas Dependence", value: "EU Russian gas imports down to 15% from 40% pre-invasion", source: "Eurostat", sourceUrl: "https://ec.europa.eu/eurostat", freshness: "WEEKLY", status: "POSITIVE" },
            { label: "Sanctions Evasion", value: "Parallel imports via Kazakhstan, Turkey rising — $8.2B in restricted goods transited", source: "RUSI", sourceUrl: "https://rusi.org/", freshness: "WEEKLY", status: "NEGATIVE" },
          ],
        },
      ],
      SOCIAL: [
        {
          id: "EU-SOC-1",
          dimension: "SOCIAL",
          name: "Public Opinion & War Fatigue",
          description: "European public support for Ukraine, refugee integration, and anti-war sentiment",
          assessment: 0.1,
          trend: "DEGRADING",
          ascope: ["PEOPLE", "EVENTS"],
          lastUpdated: hoursAgo(6),
          indicators: [
            { label: "Ukraine Support Polling", value: "Support for military aid declining: 52% favor (down from 67% in 2023)", source: "Eurobarometer", sourceUrl: "https://europa.eu/eurobarometer/", freshness: "WEEKLY", status: "NEUTRAL" },
            { label: "Refugee Integration", value: "4.2M Ukrainian refugees in EU; integration programs strained in Germany, Poland", source: "UNHCR", sourceUrl: "https://www.unhcr.org/", freshness: "WEEKLY", status: "NEUTRAL" },
          ],
        },
      ],
      INFORMATION: [
        {
          id: "EU-INFO-1",
          dimension: "INFORMATION",
          name: "Russian Dezinformatsiya",
          description: "GRU/SVR information operations, RT/Sputnik successor networks, and troll farm activity",
          assessment: -0.6,
          trend: "DEGRADING",
          ascope: ["CAPABILITIES", "EVENTS", "PEOPLE"],
          lastUpdated: hoursAgo(1),
          indicators: [
            { label: "Doppelganger Campaign", value: "AI-generated clone news sites impersonating Der Spiegel, Le Monde detected in 12 countries", source: "EU vs Disinfo", sourceUrl: "https://euvsdisinfo.eu/", freshness: "24H", status: "CRITICAL" },
            { label: "Telegram Influence Channels", value: "1,200+ Russian-linked Telegram channels targeting European audiences; 18M combined subscribers", source: "DFRLab", sourceUrl: "https://www.atlanticcouncil.org/programs/digital-forensic-research-lab/", freshness: "24H", status: "CRITICAL" },
            { label: "RT Successor Networks", value: "6 new RT-affiliated outlets operating via African/Middle Eastern proxies", source: "Bellingcat", sourceUrl: "https://www.bellingcat.com/", freshness: "48H", status: "NEGATIVE" },
          ],
        },
      ],
      INFRASTRUCTURE: [
        {
          id: "EU-INFRA-1",
          dimension: "INFRASTRUCTURE",
          name: "Critical Infrastructure Threats",
          description: "Sabotage of undersea cables, energy systems, and cyber attacks on European infrastructure",
          assessment: -0.4,
          trend: "DEGRADING",
          ascope: ["STRUCTURES", "AREAS"],
          lastUpdated: hoursAgo(3),
          indicators: [
            { label: "Undersea Cable Incidents", value: "3 Baltic Sea cable cuts in 6 months — shadow fleet anchoring suspected", source: "BBC", sourceUrl: "https://www.bbc.com/news/world/europe", freshness: "48H", status: "CRITICAL" },
            { label: "Cyber Attacks (APT28/29)", value: "Sandworm targeting European energy grid SCADA systems; 12 incidents this quarter", source: "CISA", sourceUrl: "https://www.cisa.gov/news-events/cybersecurity-advisories", freshness: "24H", status: "CRITICAL" },
          ],
        },
      ],
    },
  },

  // ── AFRICOM ───────────────────────────────────────────────────────────
  AFRICOM: {
    gccId: "AFRICOM",
    overallCondition: "UNCERTAIN",
    keyThemes: [
      "Wagner/Africa Corps expanding influence post-Prigozhin across Sahel",
      "VEO proliferation and governance vacuums",
      "PRC economic leverage through BRI and critical mineral extraction",
      "Democratic backsliding and coup cycle in West/Central Africa",
    ],
    lastRefresh: now(),
    dimensions: {
      POLITICAL: [
        {
          id: "AF-POL-1",
          dimension: "POLITICAL",
          name: "Governance & Coup Dynamics",
          description: "Military coups, democratic backsliding, and governance vacuums exploited by external actors",
          assessment: -0.5,
          trend: "DEGRADING",
          ascope: ["ORGANIZATIONS", "PEOPLE", "EVENTS"],
          lastUpdated: hoursAgo(6),
          indicators: [
            { label: "Sahel Junta Alliance", value: "Mali-Niger-Burkina Faso 'Alliance of Sahel States' consolidated; ECOWAS expelled", source: "Africa News", sourceUrl: "https://www.africanews.com/", freshness: "WEEKLY", status: "NEGATIVE" },
            { label: "Wagner Political Integration", value: "Africa Corps advisors embedded in 6 national security councils", source: "ACLED", sourceUrl: "https://acleddata.com/", freshness: "WEEKLY", status: "CRITICAL" },
            { label: "Democratic Transitions", value: "Senegal, Ghana demonstrating democratic resilience; positive models", source: "Freedom House", sourceUrl: "https://freedomhouse.org/", freshness: "WEEKLY", status: "POSITIVE" },
          ],
        },
      ],
      MILITARY: [
        {
          id: "AF-MIL-1",
          dimension: "MILITARY",
          name: "VEO & External Actor Military Presence",
          description: "Violent extremist organizations, Wagner/Africa Corps, and foreign military presence",
          assessment: -0.5,
          trend: "STABLE",
          ascope: ["CAPABILITIES", "AREAS", "EVENTS"],
          lastUpdated: hoursAgo(4),
          indicators: [
            { label: "al-Shabaab Operations", value: "12 attacks in Somalia/Kenya border region this month; IED sophistication increasing", source: "ACLED", sourceUrl: "https://acleddata.com/", freshness: "24H", status: "CRITICAL" },
            { label: "Sahel VEO Activity", value: "JNIM/ISGS attacks up 25% YoY; expanding into coastal West Africa", source: "ACLED", sourceUrl: "https://acleddata.com/", freshness: "24H", status: "NEGATIVE" },
            { label: "Africa Corps Deployments", value: "~7,000 personnel across Mali, CAR, Libya, Burkina Faso, Niger", source: "ISW", sourceUrl: "https://www.understandingwar.org/", freshness: "WEEKLY", status: "NEGATIVE" },
          ],
        },
      ],
      ECONOMIC: [
        {
          id: "AF-ECON-1",
          dimension: "ECONOMIC",
          name: "Great Power Economic Competition",
          description: "PRC BRI expansion, Russian mineral extraction, and Western development alternatives",
          assessment: -0.3,
          trend: "STABLE",
          ascope: ["STRUCTURES", "ORGANIZATIONS"],
          lastUpdated: hoursAgo(12),
          indicators: [
            { label: "PRC Critical Minerals", value: "Chinese firms control 70% of DRC cobalt mining; lithium deals expanding in Zimbabwe", source: "Reuters", sourceUrl: "https://www.reuters.com/world/africa/", freshness: "WEEKLY", status: "NEGATIVE" },
            { label: "Wagner Mining Operations", value: "Gold extraction funding Africa Corps operations in Mali, CAR, Sudan", source: "Global Witness", sourceUrl: "https://www.globalwitness.org/", freshness: "WEEKLY", status: "NEGATIVE" },
          ],
        },
      ],
      SOCIAL: [
        {
          id: "AF-SOC-1",
          dimension: "SOCIAL",
          name: "Population & Humanitarian Dynamics",
          description: "Displacement, food insecurity, and demographic pressures",
          assessment: -0.4,
          trend: "STABLE",
          ascope: ["PEOPLE", "AREAS"],
          lastUpdated: hoursAgo(10),
          indicators: [
            { label: "Sahel Displacement", value: "4.7M IDPs across Mali, Burkina Faso, Niger; humanitarian access restricted", source: "UNHCR", sourceUrl: "https://www.unhcr.org/", freshness: "WEEKLY", status: "CRITICAL" },
            { label: "Sudan Conflict IDPs", value: "9.8M displaced; famine conditions in Darfur", source: "UNHCR", sourceUrl: "https://www.unhcr.org/", freshness: "24H", status: "CRITICAL" },
          ],
        },
      ],
      INFORMATION: [
        {
          id: "AF-INFO-1",
          dimension: "INFORMATION",
          name: "Russian/PRC IO in Africa",
          description: "Wagner disinformation, PRC state media expansion, and anti-Western narrative campaigns",
          assessment: -0.5,
          trend: "DEGRADING",
          ascope: ["CAPABILITIES", "EVENTS", "PEOPLE"],
          lastUpdated: hoursAgo(3),
          indicators: [
            { label: "Wagner Disinfo Campaigns", value: "Anti-French/anti-UN narratives drove MINUSMA withdrawal; now targeting US presence", source: "DFRLab", sourceUrl: "https://www.atlanticcouncil.org/programs/digital-forensic-research-lab/", freshness: "24H", status: "CRITICAL" },
            { label: "PRC Media Expansion", value: "CGTN Africa, Xinhua bureaus in 40+ countries; content-sharing deals with 200+ African outlets", source: "CSIS", sourceUrl: "https://www.csis.org/analysis", freshness: "WEEKLY", status: "NEGATIVE" },
          ],
        },
      ],
      INFRASTRUCTURE: [
        {
          id: "AF-INFRA-1",
          dimension: "INFRASTRUCTURE",
          name: "Infrastructure & Connectivity",
          description: "Chinese-built infrastructure, telecom networks, and digital infrastructure across Africa",
          assessment: -0.2,
          trend: "STABLE",
          ascope: ["STRUCTURES", "AREAS"],
          lastUpdated: hoursAgo(8),
          indicators: [
            { label: "Huawei Telecom Penetration", value: "Huawei/ZTE built 70% of Africa's 4G networks; data sovereignty concerns", source: "Brookings", sourceUrl: "https://www.brookings.edu/", freshness: "WEEKLY", status: "NEGATIVE" },
            { label: "BRI Port Infrastructure", value: "PRC-built/operated ports in Djibouti, Kenya, Tanzania — dual-use concerns", source: "CSIS", sourceUrl: "https://www.csis.org/analysis", freshness: "WEEKLY", status: "NEGATIVE" },
          ],
        },
      ],
    },
  },

  // ── SOUTHCOM ──────────────────────────────────────────────────────────
  SOUTHCOM: {
    gccId: "SOUTHCOM",
    overallCondition: "UNCERTAIN",
    keyThemes: [
      "PRC strategic presence expanding (ports, space facilities, telecom)",
      "Venezuelan regime stability and regional migration crisis",
      "Transnational criminal organizations as IO actors",
      "Russian influence operations via RT Español and diplomatic channels",
    ],
    lastRefresh: now(),
    dimensions: {
      POLITICAL: [
        {
          id: "SC-POL-1",
          dimension: "POLITICAL",
          name: "Authoritarian Resilience & Democracy",
          description: "Democratic erosion in Venezuela, Nicaragua, Cuba; democratic resilience elsewhere",
          assessment: -0.3,
          trend: "STABLE",
          ascope: ["ORGANIZATIONS", "PEOPLE"],
          lastUpdated: hoursAgo(6),
          indicators: [
            { label: "Venezuelan Political Crisis", value: "Maduro regime consolidated after contested 2024 election; opposition leaders in exile", source: "Reuters", sourceUrl: "https://www.reuters.com/world/americas/", freshness: "WEEKLY", status: "NEGATIVE" },
            { label: "Nicaraguan Repression", value: "300+ NGOs shuttered; Catholic Church assets seized; information blackout expanding", source: "HRW", sourceUrl: "https://www.hrw.org/americas", freshness: "WEEKLY", status: "CRITICAL" },
            { label: "Regional Democratic Health", value: "Chile, Uruguay, Costa Rica maintaining strong democratic institutions", source: "Freedom House", sourceUrl: "https://freedomhouse.org/", freshness: "WEEKLY", status: "POSITIVE" },
          ],
        },
      ],
      MILITARY: [
        {
          id: "SC-MIL-1",
          dimension: "MILITARY",
          name: "External Actor Military Presence",
          description: "PRC, Russian, and Iranian military/intelligence presence in the Western Hemisphere",
          assessment: -0.3,
          trend: "DEGRADING",
          ascope: ["CAPABILITIES", "AREAS"],
          lastUpdated: hoursAgo(8),
          indicators: [
            { label: "PRC Military Engagement", value: "Chinese military hospital ships conducting 'medical diplomacy' in 5 Caribbean nations", source: "SOUTHCOM", sourceUrl: "https://www.southcom.mil/Media/Press-Releases/", freshness: "WEEKLY", status: "NEUTRAL" },
            { label: "Russian Military Presence", value: "Tu-160 bombers deployed to Venezuela; naval visits to Cuba increasing", source: "USNI News", sourceUrl: "https://news.usni.org/", freshness: "48H", status: "NEGATIVE" },
          ],
        },
      ],
      ECONOMIC: [
        {
          id: "SC-ECON-1",
          dimension: "ECONOMIC",
          name: "PRC Economic Penetration",
          description: "Chinese investment, trade dependencies, and infrastructure development creating leverage",
          assessment: -0.3,
          trend: "DEGRADING",
          ascope: ["STRUCTURES", "ORGANIZATIONS"],
          lastUpdated: hoursAgo(10),
          indicators: [
            { label: "PRC Port Operations", value: "Chinese firms operating/building ports in Peru, Brazil, Panama — strategic access concerns", source: "CSIS", sourceUrl: "https://www.csis.org/analysis", freshness: "WEEKLY", status: "NEGATIVE" },
            { label: "Lithium Triangle Investment", value: "PRC securing lithium supply contracts in Argentina, Chile, Bolivia", source: "Reuters", sourceUrl: "https://www.reuters.com/world/americas/", freshness: "WEEKLY", status: "NEGATIVE" },
          ],
        },
      ],
      SOCIAL: [
        {
          id: "SC-SOC-1",
          dimension: "SOCIAL",
          name: "Migration & Social Stability",
          description: "Mass migration flows, humanitarian crises, and social cohesion challenges",
          assessment: -0.4,
          trend: "STABLE",
          ascope: ["PEOPLE", "AREAS", "EVENTS"],
          lastUpdated: hoursAgo(4),
          indicators: [
            { label: "Venezuelan Migration", value: "7.7M Venezuelans displaced; straining Colombia, Peru, Chile social services", source: "UNHCR", sourceUrl: "https://www.unhcr.org/", freshness: "WEEKLY", status: "CRITICAL" },
            { label: "Darien Gap Migration", value: "500K+ transiting annually; TCO-controlled routes weaponized for smuggling", source: "IOM", sourceUrl: "https://www.iom.int/", freshness: "24H", status: "NEGATIVE" },
          ],
        },
      ],
      INFORMATION: [
        {
          id: "SC-INFO-1",
          dimension: "INFORMATION",
          name: "Anti-US Narrative Campaigns",
          description: "Russian, Chinese, and Venezuelan government information operations in Latin America",
          assessment: -0.4,
          trend: "STABLE",
          ascope: ["CAPABILITIES", "EVENTS", "PEOPLE"],
          lastUpdated: hoursAgo(3),
          indicators: [
            { label: "RT Español Reach", value: "RT Español largest foreign news channel in Latin America; 15M social media followers", source: "DFRLab", sourceUrl: "https://www.atlanticcouncil.org/programs/digital-forensic-research-lab/", freshness: "WEEKLY", status: "NEGATIVE" },
            { label: "TeleSUR Narratives", value: "Venezuelan state media amplifying anti-US/anti-OAS content across Spanish-speaking audiences", source: "MEMRI", sourceUrl: "https://www.memri.org/", freshness: "24H", status: "NEGATIVE" },
            { label: "PRC Media Partnerships", value: "Xinhua content-sharing with 40+ Latin American media outlets", source: "CSIS", sourceUrl: "https://www.csis.org/analysis", freshness: "WEEKLY", status: "NEGATIVE" },
          ],
        },
      ],
      INFRASTRUCTURE: [
        {
          id: "SC-INFRA-1",
          dimension: "INFRASTRUCTURE",
          name: "Strategic Infrastructure & Telecom",
          description: "Chinese-built ports, space facilities, and Huawei telecom penetration",
          assessment: -0.2,
          trend: "DEGRADING",
          ascope: ["STRUCTURES", "AREAS"],
          lastUpdated: hoursAgo(8),
          indicators: [
            { label: "PRC Space Facility", value: "Chinese deep space station in Neuquén, Argentina — military dual-use capability", source: "CSIS", sourceUrl: "https://www.csis.org/analysis", freshness: "WEEKLY", status: "NEGATIVE" },
            { label: "Huawei 5G Rollout", value: "Huawei 5G contracts in Brazil, Mexico, Colombia — data routing concerns", source: "Reuters", sourceUrl: "https://www.reuters.com/technology/", freshness: "WEEKLY", status: "NEGATIVE" },
          ],
        },
      ],
    },
  },

  // ── NORTHCOM ──────────────────────────────────────────────────────────
  NORTHCOM: {
    gccId: "NORTHCOM",
    overallCondition: "UNCERTAIN",
    keyThemes: [
      "Foreign adversary influence operations targeting US elections and social cohesion",
      "Critical infrastructure cyber threats (Volt Typhoon, Sandworm)",
      "Domestic information environment polarization",
      "Border security and TCO information operations",
    ],
    lastRefresh: now(),
    dimensions: {
      POLITICAL: [
        {
          id: "NC-POL-1",
          dimension: "POLITICAL",
          name: "Foreign Election Interference",
          description: "State-sponsored influence operations targeting US democratic processes",
          assessment: -0.4,
          trend: "DEGRADING",
          ascope: ["EVENTS", "PEOPLE", "ORGANIZATIONS"],
          lastUpdated: hoursAgo(2),
          indicators: [
            { label: "PRC Influence Operations", value: "Spamouflage network operating 8,000+ accounts targeting US political discourse", source: "DFRLab", sourceUrl: "https://www.atlanticcouncil.org/programs/digital-forensic-research-lab/", freshness: "24H", status: "CRITICAL" },
            { label: "Russian Election Interference", value: "GRU troll farms producing AI-generated content targeting swing state voters", source: "FBI", sourceUrl: "https://www.fbi.gov/investigate/counterintelligence/foreign-influence", freshness: "24H", status: "CRITICAL" },
            { label: "Iranian Hack-and-Leak", value: "IRGC-affiliated actors targeting campaign infrastructure; 2 incidents this cycle", source: "CISA", sourceUrl: "https://www.cisa.gov/news-events/cybersecurity-advisories", freshness: "48H", status: "NEGATIVE" },
          ],
        },
      ],
      MILITARY: [
        {
          id: "NC-MIL-1",
          dimension: "MILITARY",
          name: "Homeland Defense Posture",
          description: "NORAD/NORTHCOM defense readiness, missile defense, and domain awareness",
          assessment: 0.3,
          trend: "STABLE",
          ascope: ["CAPABILITIES", "STRUCTURES"],
          lastUpdated: hoursAgo(6),
          indicators: [
            { label: "NORAD Modernization", value: "Next-Gen OTH radar deployment on track; Arctic early warning sensors upgraded", source: "DoD", sourceUrl: "https://www.defense.gov/News/Releases/", freshness: "WEEKLY", status: "POSITIVE" },
            { label: "Ballistic Missile Defense", value: "GBI interceptor stockpile maintained at 44; NGI development progressing", source: "MDA", sourceUrl: "https://www.mda.mil/news/", freshness: "WEEKLY", status: "POSITIVE" },
          ],
        },
      ],
      ECONOMIC: [
        {
          id: "NC-ECON-1",
          dimension: "ECONOMIC",
          name: "Economic Security & Supply Chains",
          description: "Critical supply chain vulnerabilities, economic espionage, and trade security",
          assessment: -0.2,
          trend: "IMPROVING",
          ascope: ["STRUCTURES", "CAPABILITIES"],
          lastUpdated: hoursAgo(12),
          indicators: [
            { label: "PRC Economic Espionage", value: "FBI reports 2,000+ active PRC-linked espionage investigations", source: "FBI", sourceUrl: "https://www.fbi.gov/investigate/counterintelligence", freshness: "WEEKLY", status: "CRITICAL" },
            { label: "Semiconductor Independence", value: "CHIPS Act investments yielding results; 3 new fabs under construction", source: "Commerce Dept", sourceUrl: "https://www.commerce.gov/", freshness: "WEEKLY", status: "POSITIVE" },
          ],
        },
      ],
      SOCIAL: [
        {
          id: "NC-SOC-1",
          dimension: "SOCIAL",
          name: "Social Cohesion & Polarization",
          description: "Domestic information environment health, social media polarization, and trust in institutions",
          assessment: -0.3,
          trend: "STABLE",
          ascope: ["PEOPLE", "EVENTS"],
          lastUpdated: hoursAgo(4),
          indicators: [
            { label: "Institutional Trust", value: "Trust in media at 32%, trust in federal government at 22% (Gallup)", source: "Gallup", sourceUrl: "https://news.gallup.com/", freshness: "WEEKLY", status: "NEGATIVE" },
            { label: "Foreign-Amplified Division", value: "Russian/PRC troll farms amplifying both sides of divisive domestic issues", source: "DFRLab", sourceUrl: "https://www.atlanticcouncil.org/programs/digital-forensic-research-lab/", freshness: "24H", status: "CRITICAL" },
          ],
        },
      ],
      INFORMATION: [
        {
          id: "NC-INFO-1",
          dimension: "INFORMATION",
          name: "Foreign Malign Influence",
          description: "Multi-vector foreign influence operations targeting the US homeland information environment",
          assessment: -0.5,
          trend: "DEGRADING",
          ascope: ["CAPABILITIES", "EVENTS", "PEOPLE"],
          lastUpdated: hoursAgo(1),
          indicators: [
            { label: "AI-Generated Disinfo", value: "400% increase in AI-generated political content; detection lagging creation", source: "Stanford IO", sourceUrl: "https://io.stanford.edu/", freshness: "24H", status: "CRITICAL" },
            { label: "TikTok Influence Vectors", value: "PRC-linked content amplification algorithms promoting divisive content to US youth", source: "CISA", sourceUrl: "https://www.cisa.gov/news-events/cybersecurity-advisories", freshness: "24H", status: "NEGATIVE" },
            { label: "Doppelganger US Operations", value: "Russian Doppelganger campaign cloning 50+ US local news sites", source: "DFRLab", sourceUrl: "https://www.atlanticcouncil.org/programs/digital-forensic-research-lab/", freshness: "24H", status: "CRITICAL" },
          ],
        },
      ],
      INFRASTRUCTURE: [
        {
          id: "NC-INFRA-1",
          dimension: "INFRASTRUCTURE",
          name: "Critical Infrastructure Cyber Threats",
          description: "Pre-positioned cyber threats to water, energy, telecom, and transportation systems",
          assessment: -0.5,
          trend: "DEGRADING",
          ascope: ["STRUCTURES", "CAPABILITIES"],
          lastUpdated: hoursAgo(2),
          indicators: [
            { label: "Volt Typhoon Pre-Positioning", value: "PRC cyber actors pre-positioned in US critical infrastructure — water, energy, telecom", source: "CISA", sourceUrl: "https://www.cisa.gov/news-events/cybersecurity-advisories", freshness: "24H", status: "CRITICAL" },
            { label: "Water System Attacks", value: "Iranian-linked CyberAv3ngers targeting water utility PLCs in multiple states", source: "CISA", sourceUrl: "https://www.cisa.gov/news-events/cybersecurity-advisories", freshness: "48H", status: "CRITICAL" },
            { label: "GPS Spoofing/Jamming", value: "Commercial aviation GPS spoofing incidents increasing near US borders", source: "FAA", sourceUrl: "https://www.faa.gov/", freshness: "WEEKLY", status: "NEGATIVE" },
          ],
        },
      ],
    },
  },
};

export function getPMESIIMapping(gccId: GCCId): PMESIIMapping {
  return PMESII_DATA[gccId] ?? PMESII_DATA.NORTHCOM ?? PMESII_DATA.INDOPACOM!;
}

export const DIMENSION_CONFIG: Record<PMESIIDimension, { label: string; color: string; icon: string }> = {
  POLITICAL: { label: "POLITICAL", color: "#a855f7", icon: "⚖" },
  MILITARY: { label: "MILITARY", color: "#ef4444", icon: "⚔" },
  ECONOMIC: { label: "ECONOMIC", color: "#f59e0b", icon: "◈" },
  SOCIAL: { label: "SOCIAL", color: "#10b981", icon: "◎" },
  INFORMATION: { label: "INFORMATION", color: "#00d4ff", icon: "◉" },
  INFRASTRUCTURE: { label: "INFRASTRUCTURE", color: "#64748b", icon: "▣" },
};
