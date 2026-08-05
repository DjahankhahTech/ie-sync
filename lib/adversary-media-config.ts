import { type GCCId } from "./gcc-config";

/**
 * Adversary-aligned, state-controlled media monitored per theater — the
 * outlets anti-US audiences in each AOR are actually reading. Every feed URL
 * was curl-verified working on 2026-08-05; outlets whose feeds are dead or
 * unreachable from a US datacenter (PressTV, KCNA Watch, TeleSUR) are NOT
 * listed — the reader shows only what it can truthfully ingest.
 *
 * PROVENANCE: these are propaganda/state-media sources. They are surfaced for
 * situational awareness of the adversary narrative space, never as factual
 * reporting. The UI labels every item with its state sponsor.
 */

export type SponsorId = "PRC" | "RUS" | "IRN" | "CUB";

export const SPONSOR_META: Record<SponsorId, { label: string; color: string }> = {
  PRC: { label: "PRC state media", color: "#f87171" },
  RUS: { label: "Russian state media", color: "#fb923c" },
  IRN: { label: "Iranian state media", color: "#facc15" },
  CUB: { label: "Cuban state media", color: "#a78bfa" },
};

export interface AdversaryOutlet {
  id: string;
  name: string;
  sponsor: SponsorId;
  url: string;
}

const OUTLETS = {
  globalTimes: { id: "global-times", name: "Global Times", sponsor: "PRC", url: "https://www.globaltimes.cn/rss/outbrain.xml" },
  cgtn: { id: "cgtn-world", name: "CGTN", sponsor: "PRC", url: "https://www.cgtn.com/subscribe/rss/section/world.xml" },
  peoplesDaily: { id: "peoples-daily", name: "People's Daily", sponsor: "PRC", url: "http://en.people.cn/rss/90777.xml" },
  xinhua: { id: "xinhua-world", name: "Xinhua", sponsor: "PRC", url: "https://english.news.cn/rss/worldrss.xml" },
  chinaDaily: { id: "china-daily", name: "China Daily", sponsor: "PRC", url: "https://www.chinadaily.com.cn/rss/world_rss.xml" },
  rtNews: { id: "rt-news", name: "RT", sponsor: "RUS", url: "https://www.rt.com/rss/news/" },
  rtWorld: { id: "rt-world", name: "RT World", sponsor: "RUS", url: "https://www.rt.com/rss/" },
  sputnik: { id: "sputnik-globe", name: "Sputnik", sponsor: "RUS", url: "https://sputnikglobe.com/export/rss2/archive/index.xml" },
  sputnikAfrica: { id: "sputnik-africa", name: "Sputnik Africa", sponsor: "RUS", url: "https://en.sputniknews.africa/export/rss2/archive/index.xml" },
  tass: { id: "tass", name: "TASS", sponsor: "RUS", url: "https://tass.com/rss/v2.xml" },
  tehranTimes: { id: "tehran-times", name: "Tehran Times", sponsor: "IRN", url: "https://www.tehrantimes.com/rss" },
  mehr: { id: "mehr-news", name: "Mehr News", sponsor: "IRN", url: "https://en.mehrnews.com/rss" },
  irna: { id: "irna", name: "IRNA", sponsor: "IRN", url: "https://en.irna.ir/rss" },
  granma: { id: "granma", name: "Granma", sponsor: "CUB", url: "https://en.granma.cu/feed" },
} as const satisfies Record<string, AdversaryOutlet>;

export interface TheaterAdversaryMedia {
  outlets: AdversaryOutlet[];
  /**
   * Optional topical filter (functional commands): keep only items whose
   * title/summary matches a keyword. Geographic commands show the full firehose.
   */
  keywords?: string[];
}

export const ADVERSARY_MEDIA: Record<GCCId, TheaterAdversaryMedia> = {
  INDOPACOM: { outlets: [OUTLETS.globalTimes, OUTLETS.cgtn, OUTLETS.peoplesDaily, OUTLETS.xinhua, OUTLETS.chinaDaily, OUTLETS.rtNews] },
  EUCOM: { outlets: [OUTLETS.rtWorld, OUTLETS.rtNews, OUTLETS.sputnik, OUTLETS.tass] },
  CENTCOM: { outlets: [OUTLETS.tehranTimes, OUTLETS.mehr, OUTLETS.irna, OUTLETS.rtNews, OUTLETS.sputnik] },
  AFRICOM: { outlets: [OUTLETS.sputnikAfrica, OUTLETS.rtNews, OUTLETS.cgtn, OUTLETS.globalTimes] },
  NORTHCOM: { outlets: [OUTLETS.rtNews, OUTLETS.sputnik, OUTLETS.globalTimes, OUTLETS.tass] },
  SOUTHCOM: { outlets: [OUTLETS.granma, OUTLETS.rtNews, OUTLETS.sputnik, OUTLETS.globalTimes] },
  SPACECOM: {
    outlets: [OUTLETS.globalTimes, OUTLETS.rtNews, OUTLETS.tass, OUTLETS.sputnik, OUTLETS.cgtn],
    keywords: ["space", "satellite", "orbit", "orbital", "aerospace", "rocket", "launch", "lunar", "moon", "mars", "starlink", "gps", "glonass", "beidou"],
  },
  CYBERCOM: {
    outlets: [OUTLETS.globalTimes, OUTLETS.rtNews, OUTLETS.tass, OUTLETS.sputnik, OUTLETS.cgtn, OUTLETS.chinaDaily],
    keywords: ["cyber", "hacker", "hacking", "espionage", "surveillance", "data breach", "malware", "artificial intelligence", " ai ", "chip", "semiconductor", "internet", "disinformation"],
  },
};
