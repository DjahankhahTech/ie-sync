"use client";

import { useState } from "react";
import { useIEStore } from "@/store/ie-store";
import { GCC_CONFIGS } from "@/lib/gcc-config";
import { useMediaFeeds } from "@/hooks/useMediaFeeds";

type MediaFilter = "all" | "video" | "image";

export function MediaFeedPanel() {
  const { mediaFeeds, mediaFeedsLoading, mediaFeedsError, activeGCC } = useIEStore();
  const { refetch } = useMediaFeeds();
  const gcc = GCC_CONFIGS[activeGCC];
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [expanded, setExpanded] = useState(true);

  const filteredItems = filter === "all"
    ? mediaFeeds
    : mediaFeeds.filter((item) => item.mediaType === filter);

  const videoCount = mediaFeeds.filter((f) => f.mediaType === "video").length;
  const imageCount = mediaFeeds.filter((f) => f.mediaType === "image").length;

  return (
    <div className="tactical-card flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1e3a5f] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[#00d4ff] text-sm font-mono hover:text-white transition-colors"
          >
            {expanded ? "▼" : "▶"}
          </button>
          <div>
            <div className="text-[#00d4ff] text-xs font-bold tracking-widest">
              IE MEDIA FEED — {gcc.abbr}
            </div>
            <div className="text-[#475569] text-[9px] font-mono mt-0.5">
              VIDEO & IMAGE OSINT // {gcc.aor.toUpperCase()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 text-[9px] font-mono">
            {(["all", "video", "image"] as MediaFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  filter === f
                    ? "border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff10]"
                    : "border-[#1e3a5f] text-[#475569] hover:border-[#334155] hover:text-[#94a3b8]"
                }`}
              >
                {f.toUpperCase()}
                {f === "video" && videoCount > 0 && ` (${videoCount})`}
                {f === "image" && imageCount > 0 && ` (${imageCount})`}
                {f === "all" && ` (${mediaFeeds.length})`}
              </button>
            ))}
          </div>
          {/* Status + refresh */}
          <div className="flex items-center gap-1.5 text-[9px] font-mono">
            <span className={`status-dot ${mediaFeedsLoading ? "warning" : mediaFeedsError ? "" : "active"}`}
              style={mediaFeedsError ? { background: "#ef4444" } : undefined}
            />
            <span className="text-[#475569]">
              {mediaFeedsLoading ? "FETCHING..." : mediaFeedsError ? "ERROR" : `${mediaFeeds.length} items`}
            </span>
          </div>
          <button
            onClick={refetch}
            disabled={mediaFeedsLoading}
            className="text-[9px] border rounded px-2 py-0.5 hover:bg-[#1e3a5f] transition-colors disabled:opacity-50"
            style={{ borderColor: gcc.color, color: gcc.color }}
          >
            ↻
          </button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-3">
          {mediaFeedsLoading && mediaFeeds.length === 0 && (
            <div className="py-8 flex items-center justify-center">
              <div className="text-[#00d4ff] text-xs font-mono animate-pulse tracking-widest">
                SCANNING MEDIA SOURCES...
              </div>
            </div>
          )}

          {mediaFeedsError && mediaFeeds.length === 0 && (
            <div className="py-4 text-center text-[#ef4444] text-xs font-mono">
              MEDIA FEED ERROR: {mediaFeedsError}
            </div>
          )}

          {filteredItems.length === 0 && !mediaFeedsLoading && !mediaFeedsError && (
            <div className="py-4 text-center text-[#334155] text-xs font-mono">
              NO {filter.toUpperCase()} MEDIA AVAILABLE FOR {gcc.abbr}
            </div>
          )}

          {/* Media grid */}
          <div className="grid grid-cols-4 gap-3">
            {filteredItems.slice(0, 12).map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>

          {/* Methodology note */}
          {filteredItems.length > 0 && (
            <div className="text-[8px] font-mono text-[#334155] mt-3 pt-2 border-t border-[#1e3a5f]">
              <span className="text-[#475569]">SOURCE:</span> YouTube RSS feeds from verified news/analysis channels. Relevance scored by GCC keyword matching. <span className="text-[#ef4444]">Content not validated — analyst review required.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MediaCard({ item }: { item: { id: string; title: string; description: string; link: string; published: string; source: string; mediaType: "video" | "image"; thumbnailUrl: string | null; duration: string | null; relevanceScore: number; matchedKeywords: string[] } }) {
  const timeAgo = (() => {
    try {
      const diff = Date.now() - new Date(item.published).getTime();
      const hrs = Math.floor(diff / 3600000);
      if (hrs < 1) return `${Math.floor(diff / 60000)}m`;
      if (hrs < 24) return `${hrs}h`;
      return `${Math.floor(hrs / 24)}d`;
    } catch { return ""; }
  })();

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block border border-[#1e3a5f] rounded overflow-hidden hover:border-[#00d4ff] transition-colors bg-[#070d1a]"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[#0a1628] overflow-hidden">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#334155] text-2xl">
            {item.mediaType === "video" ? "▶" : "◻"}
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-1 left-1 flex gap-1">
          <span className={`text-[8px] font-black px-1 py-0.5 rounded ${
            item.mediaType === "video" ? "bg-[#ef4444] text-white" : "bg-[#3b82f6] text-white"
          }`}>
            {item.mediaType === "video" ? "▶ VIDEO" : "◻ IMAGE"}
          </span>
        </div>

        {item.duration && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-mono px-1 py-0.5 rounded">
            {item.duration}
          </span>
        )}

        {item.relevanceScore > 0 && (
          <span
            className="absolute top-1 right-1 text-[9px] font-black px-1 py-0.5 rounded"
            style={{
              background: item.relevanceScore >= 50 ? "#ef444430" : "#f59e0b30",
              color: item.relevanceScore >= 50 ? "#ef4444" : "#f59e0b",
            }}
          >
            {item.relevanceScore}
          </span>
        )}
      </div>

      {/* Title + meta */}
      <div className="p-2">
        <div className="text-[#e2e8f0] text-[10px] group-hover:text-[#00d4ff] transition-colors line-clamp-2 leading-tight">
          {item.title}
        </div>
        <div className="flex items-center justify-between mt-1 text-[8px] font-mono text-[#475569]">
          <span>{item.source}</span>
          <span>{timeAgo} ago</span>
        </div>
        {item.matchedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.matchedKeywords.slice(0, 3).map((kw) => (
              <span key={kw} className="text-[7px] font-mono text-[#f59e0b] bg-[#f59e0b10] px-1 rounded">
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}
