export type GCCId =
  | "INDOPACOM"
  | "CENTCOM"
  | "EUCOM"
  | "AFRICOM"
  | "SOUTHCOM"
  | "NORTHCOM"
  | "SPACECOM"
  | "CYBERCOM";

export interface GCCConfig {
  id: GCCId;
  abbr: string;
  name: string;
  aor: string;
  region: string;
  flag: string;
  color: string;
  hq: string;
  countries: string[];
  /** Keywords for feed filtering */
  keywords: string[];
  /** RSS feed sources (OSINT/public) */
  feeds: FeedSource[];
  /** Lat/lon center for map display */
  mapCenter: [number, number];
  mapZoom: number;
  /** Threat vectors prominent in this AOR */
  threatVectors: string[];
}

export interface FeedSource {
  name: string;
  url: string;
  type: "RSS" | "ATOM" | "API";
  category: "NEWS" | "SECURITY" | "SOCIAL" | "GOVERNMENT" | "MILITARY";
  lang?: string;
}

export const GCC_CONFIGS: Record<GCCId, GCCConfig> = {
  INDOPACOM: {
    id: "INDOPACOM",
    abbr: "INDOPACOM",
    name: "US Indo-Pacific Command",
    aor: "Indo-Pacific AOR",
    region: "Pacific / East Asia",
    flag: "🌏",
    color: "#00d4ff",
    hq: "Camp H.M. Smith, Hawaii",
    countries: ["China", "North Korea", "Japan", "Taiwan", "Philippines", "South Korea", "Australia", "India"],
    keywords: [
      "China", "PRC", "PLA", "Taiwan", "DPRK", "North Korea", "South China Sea",
      "Indo-Pacific", "INDOPACOM", "Japan", "Korea", "Philippines", "disinformation",
      "cyber", "influence operation", "propaganda", "Okinawa", "THAAD", "hypersonic",
    ],
    feeds: [
      { name: "BBC Asia", url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml", type: "RSS", category: "NEWS" },
      { name: "NYT Asia-Pacific", url: "https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml", type: "RSS", category: "NEWS" },
      { name: "The Diplomat", url: "https://thediplomat.com/feed", type: "RSS", category: "SECURITY" },
      { name: "RAND Security", url: "https://www.rand.org/topics/information-operations.xml", type: "RSS", category: "SECURITY" },
    ],
    mapCenter: [125, 30],
    mapZoom: 4,
    threatVectors: ["PRC IO", "DPRK Cyber", "Disinformation", "EW / SIGINT", "Gray Zone Ops"],
  },

  CENTCOM: {
    id: "CENTCOM",
    abbr: "CENTCOM",
    name: "US Central Command",
    aor: "Middle East / Central Asia AOR",
    region: "Middle East / Central Asia",
    flag: "🌍",
    color: "#f59e0b",
    hq: "MacDill AFB, Florida",
    countries: ["Iran", "Iraq", "Syria", "Yemen", "Saudi Arabia", "Afghanistan", "Pakistan", "Qatar"],
    keywords: [
      "Iran", "IRGC", "Houthi", "Yemen", "Iraq", "Syria", "Taliban", "ISIS", "ISIL",
      "Hamas", "Hezbollah", "CENTCOM", "Middle East", "cyber attack", "propaganda",
      "influence", "drone", "missile", "Red Sea", "Strait of Hormuz",
    ],
    feeds: [
      { name: "BBC Middle East", url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml", type: "RSS", category: "NEWS" },
      { name: "Al Jazeera English", url: "https://www.aljazeera.com/xml/rss/all.xml", type: "RSS", category: "NEWS" },
      { name: "Middle East Eye", url: "https://www.middleeasteye.net/rss", type: "RSS", category: "NEWS" },
      { name: "Foreign Policy", url: "https://foreignpolicy.com/feed/", type: "RSS", category: "SECURITY" },
    ],
    mapCenter: [50, 25],
    mapZoom: 4,
    threatVectors: ["Iran IO", "Houthi Influence Ops", "ISIS Propaganda", "Proxy Networks", "Cyber"],
  },

  EUCOM: {
    id: "EUCOM",
    abbr: "EUCOM",
    name: "US European Command",
    aor: "European AOR",
    region: "Europe / Russia",
    flag: "🌐",
    color: "#3b82f6",
    hq: "Stuttgart, Germany",
    countries: ["Russia", "Ukraine", "Belarus", "NATO", "Germany", "France", "UK", "Poland", "Baltic States"],
    keywords: [
      "Russia", "Ukraine", "NATO", "Wagner", "Kremlin", "disinformation", "hybrid warfare",
      "EUCOM", "Europe", "Baltic", "Belarus", "Zelensky", "Putin", "cyber attack",
      "propaganda", "RT", "Sputnik", "information war", "GRU", "SVR",
    ],
    feeds: [
      { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", type: "RSS", category: "NEWS" },
      { name: "EU vs Disinfo", url: "https://euvsdisinfo.eu/feed", type: "RSS", category: "SECURITY" },
      { name: "Bellingcat", url: "https://www.bellingcat.com/feed/", type: "RSS", category: "SECURITY" },
      { name: "Foreign Policy", url: "https://foreignpolicy.com/feed/", type: "RSS", category: "SECURITY" },
    ],
    mapCenter: [30, 52],
    mapZoom: 4,
    threatVectors: ["Russian IO / Hybrid Warfare", "Dezinformatsiya", "Wagner Influence", "Cyber (APT28/29)", "Energy Coercion"],
  },

  AFRICOM: {
    id: "AFRICOM",
    abbr: "AFRICOM",
    name: "US Africa Command",
    aor: "African AOR",
    region: "Africa",
    flag: "🌍",
    color: "#10b981",
    hq: "Stuttgart, Germany",
    countries: ["Mali", "Niger", "Sudan", "Somalia", "Libya", "Ethiopia", "Mozambique", "DR Congo"],
    keywords: [
      "Africa", "Sahel", "Mali", "Niger", "al-Shabaab", "Boko Haram", "Wagner",
      "AFRICOM", "Somalia", "Libya", "Sudan", "disinformation", "influence", "Russia Africa",
      "China Africa", "coup", "propaganda", "terrorist",
    ],
    feeds: [
      { name: "AP Africa", url: "https://rsshub.app/ap/topics/apf-intlnews", type: "RSS", category: "NEWS" },
      { name: "AllAfrica", url: "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf", type: "RSS", category: "NEWS" },
      { name: "BBC Africa", url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml", type: "RSS", category: "NEWS" },
    ],
    mapCenter: [20, 5],
    mapZoom: 3,
    threatVectors: ["Wagner IO", "VEO Propaganda", "Russian Influence", "Chinese Influence", "Coup Narratives"],
  },

  SOUTHCOM: {
    id: "SOUTHCOM",
    abbr: "SOUTHCOM",
    name: "US Southern Command",
    aor: "Latin America / Caribbean AOR",
    region: "Latin America",
    flag: "🌎",
    color: "#a855f7",
    hq: "Doral, Florida",
    countries: ["Venezuela", "Cuba", "Nicaragua", "Colombia", "Brazil", "Mexico", "Haiti", "Bolivia"],
    keywords: [
      "Venezuela", "Cuba", "Nicaragua", "SOUTHCOM", "Latin America", "narco",
      "cartel", "Maduro", "disinformation", "China Latin America", "Russia Latin America",
      "influence operation", "social media", "propaganda", "migration", "Haiti",
    ],
    feeds: [
      { name: "BBC Latin America", url: "https://feeds.bbci.co.uk/news/world/latin_america/rss.xml", type: "RSS", category: "NEWS" },
      { name: "NYT Americas", url: "https://rss.nytimes.com/services/xml/rss/nyt/Americas.xml", type: "RSS", category: "NEWS" },
      { name: "InSight Crime", url: "https://insightcrime.org/feed/", type: "RSS", category: "SECURITY" },
    ],
    mapCenter: [-60, -10],
    mapZoom: 3,
    threatVectors: ["Venezuelan IO", "Cuban Intelligence", "Narco-Influence Ops", "Chinese Influence", "Russian Media"],
  },

  NORTHCOM: {
    id: "NORTHCOM",
    abbr: "NORTHCOM",
    name: "US Northern Command",
    aor: "North America / CONUS AOR",
    region: "North America / CONUS",
    flag: "🇺🇸",
    color: "#ef4444",
    hq: "Peterson SFB, Colorado",
    countries: ["Canada", "Mexico", "United States"],
    keywords: [
      "NORTHCOM", "CONUS", "homeland", "cyber attack", "infrastructure", "election",
      "disinformation", "domestic", "Canada", "Mexico", "border", "critical infrastructure",
      "China espionage", "Russia influence", "influence operation", "FBI",
    ],
    feeds: [
      { name: "AP US News", url: "https://rsshub.app/ap/topics/apf-usnews", type: "RSS", category: "NEWS" },
      { name: "Reuters US", url: "https://feeds.reuters.com/reuters/domesticNews", type: "RSS", category: "NEWS" },
      { name: "BBC US & Canada", url: "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml", type: "RSS", category: "NEWS" },
    ],
    mapCenter: [-95, 45],
    mapZoom: 4,
    threatVectors: ["Election Influence Ops", "Critical Infra Cyber", "PRC Espionage", "Russian IO", "Domestic Extremism"],
  },

  SPACECOM: {
    id: "SPACECOM",
    abbr: "SPACECOM",
    name: "US Space Command",
    aor: "Global — Space Domain",
    region: "Space / Orbital",
    flag: "🛰",
    color: "#818cf8",
    hq: "Peterson SFB, Colorado",
    countries: ["China", "Russia", "United States", "Iran", "North Korea"],
    keywords: [
      "satellite", "counterspace", "ASAT", "anti-satellite", "orbital", "on-orbit",
      "Space Force", "USSPACECOM", "Space Domain Awareness", "GPS jamming", "SATCOM",
      "directed energy", "co-orbital", "rendezvous proximity", "PLA Aerospace Force",
      "Roscosmos", "kinetic", "spoofing", "launch", "low earth orbit", "geostationary",
    ],
    feeds: [
      { name: "SpaceNews", url: "https://spacenews.com/feed/", type: "RSS", category: "NEWS" },
      { name: "Breaking Defense", url: "https://breakingdefense.com/feed/", type: "RSS", category: "MILITARY" },
      { name: "Defense One", url: "https://www.defenseone.com/rss/", type: "RSS", category: "SECURITY" },
      { name: "RAND Security", url: "https://www.rand.org/topics/information-operations.xml", type: "RSS", category: "SECURITY" },
    ],
    mapCenter: [10, 30],
    mapZoom: 2,
    threatVectors: ["Counterspace (ASAT / Co-orbital)", "GPS / SATCOM Jamming", "Directed Energy", "Cyber-to-Space", "On-orbit RPO"],
  },

  CYBERCOM: {
    id: "CYBERCOM",
    abbr: "CYBERCOM",
    name: "US Cyber Command",
    aor: "Global — Cyberspace Domain",
    region: "Cyberspace",
    flag: "🔐",
    color: "#14b8a6",
    hq: "Fort Meade, Maryland",
    countries: ["China", "Russia", "Iran", "North Korea", "United States"],
    keywords: [
      "cyberattack", "ransomware", "APT", "malware", "intrusion", "breach", "zero-day",
      "Volt Typhoon", "Salt Typhoon", "critical infrastructure", "CYBERCOM", "CISA",
      "Lazarus", "Sandworm", "supply chain", "phishing", "hacktivist", "data breach",
      "living off the land", "botnet", "exploit", "espionage", "wiper",
    ],
    feeds: [
      { name: "CISA Advisories", url: "https://www.cisa.gov/cybersecurity-advisories/all.xml", type: "RSS", category: "GOVERNMENT" },
      { name: "The Record", url: "https://therecord.media/feed", type: "RSS", category: "SECURITY" },
      { name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/", type: "RSS", category: "SECURITY" },
      { name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/", type: "RSS", category: "SECURITY" },
    ],
    mapCenter: [10, 30],
    mapZoom: 2,
    threatVectors: ["Critical-Infra Pre-positioning", "Ransomware / Criminal Proxies", "APT Espionage", "Hack-and-Leak", "Supply-Chain Compromise"],
  },
};
