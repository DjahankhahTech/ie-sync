import { type GCCId } from "./gcc-config";

export interface MediaFeedSource {
  name: string;
  url: string;
  mediaType: "video" | "image";
  category: "NEWS" | "ANALYSIS" | "OSINT" | "GOVERNMENT" | "THINK_TANK";
}

// ── Media feed sources by GCC ─────────────────────────────────────────────
// Video feeds: YouTube RSS from verified news/analysis channels
// All channel IDs verified via curl (200 OK) on 2026-03-22
//
// YouTube channel RSS format: https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
export const MEDIA_FEED_SOURCES: Record<GCCId, MediaFeedSource[]> = {
  INDOPACOM: [
    { name: "CSIS", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCaqnykSWDAZG0HAh7OYxo6A", mediaType: "video", category: "THINK_TANK" },
    { name: "USNI News", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCR0fZh5SBxxMNYdg0VzRFkg", mediaType: "video", category: "NEWS" },
    { name: "DW News", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCknLrEdhRCp1aegoMqRaCZg", mediaType: "video", category: "NEWS" },
    { name: "AP News", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCMtFAi84ehTSYSE9XoHefig", mediaType: "video", category: "NEWS" },
  ],

  CENTCOM: [
    { name: "Middle East Eye", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCb--64Gl51jIEVE-GLDAVTg", mediaType: "video", category: "NEWS" },
    { name: "Al Jazeera English", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCNye-wNBqNL5ZzHSJj3l8Bg", mediaType: "video", category: "NEWS" },
    { name: "CENTCOM Official", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCNEEHeS9Y2yFVLbWGeHhbYA", mediaType: "video", category: "GOVERNMENT" },
    { name: "BBC News Arabic", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCelk6aHijZq-GJBBB9YpReA", mediaType: "video", category: "NEWS" },
  ],

  EUCOM: [
    { name: "Bellingcat", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCFl-GzKYeCW3iWjnQDuxzAA", mediaType: "video", category: "OSINT" },
    { name: "DW News", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCknLrEdhRCp1aegoMqRaCZg", mediaType: "video", category: "NEWS" },
    { name: "Euronews", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCW2QcKZiU8aUGg4yxCIditg", mediaType: "video", category: "NEWS" },
    { name: "NATO Channel", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCHlEaKbepQ_S9iIoZPKVQew", mediaType: "video", category: "GOVERNMENT" },
  ],

  AFRICOM: [
    { name: "Africa News", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC1_E8NeF5QHY2dtdLRBCCLA", mediaType: "video", category: "NEWS" },
    { name: "DW News", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCknLrEdhRCp1aegoMqRaCZg", mediaType: "video", category: "NEWS" },
    { name: "France 24", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCCCPCZNChQdGa9EkATeye4g", mediaType: "video", category: "NEWS" },
  ],

  SOUTHCOM: [
    { name: "BBC Mundo", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCUBIrDsIVzRpKsClMlSlTpQ", mediaType: "video", category: "NEWS" },
    { name: "DW Español", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCT4Jg8h03dD0iN3Pb5L0PMA", mediaType: "video", category: "NEWS" },
    { name: "Wilson Center", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCfOV_8tGu8qO4Zt57AMhEZw", mediaType: "video", category: "THINK_TANK" },
  ],

  NORTHCOM: [
    { name: "PBS NewsHour", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC6ZFN9Tx6xh-skXCuRHCDpQ", mediaType: "video", category: "NEWS" },
    { name: "CSPAN", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCY-0eE6fX-tkicr2mh8e_kA", mediaType: "video", category: "GOVERNMENT" },
    { name: "RAND Corporation", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCc3R8bAHzIDGikGUmp0byRQ", mediaType: "video", category: "ANALYSIS" },
    { name: "AP News", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCMtFAi84ehTSYSE9XoHefig", mediaType: "video", category: "NEWS" },
  ],

  SPACECOM: [
    { name: "CSIS", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCaqnykSWDAZG0HAh7OYxo6A", mediaType: "video", category: "THINK_TANK" },
    { name: "RAND Corporation", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCc3R8bAHzIDGikGUmp0byRQ", mediaType: "video", category: "ANALYSIS" },
    { name: "DW News", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCknLrEdhRCp1aegoMqRaCZg", mediaType: "video", category: "NEWS" },
  ],

  CYBERCOM: [
    { name: "CSIS", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCaqnykSWDAZG0HAh7OYxo6A", mediaType: "video", category: "THINK_TANK" },
    { name: "RAND Corporation", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCc3R8bAHzIDGikGUmp0byRQ", mediaType: "video", category: "ANALYSIS" },
    { name: "AP News", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCMtFAi84ehTSYSE9XoHefig", mediaType: "video", category: "NEWS" },
  ],
};
