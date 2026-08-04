import { NextRequest, NextResponse } from "next/server";
import {
  publicSources,
  isPublicLinkable,
  componentLabel,
  LIBRARY_COMPONENTS,
  LIBRARY_COUNTS,
  LIBRARY_SOURCES,
} from "@/lib/military-library";

// Doctrine API — PUBLIC LINKS ONLY.
// Offline / local-only / stub catalog entries are never returned.
//
//   /api/doctrine
//   /api/doctrine?q=ukraine&component=...&limit=50

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q") ?? undefined;
  const component = searchParams.get("component") ?? undefined;
  const limitParam = searchParams.get("limit");

  if (component && !LIBRARY_COMPONENTS.some((c) => c.id === component)) {
    return NextResponse.json({ error: `Unknown component "${component}"` }, { status: 400 });
  }

  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : NaN;
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 200;

  const sources = publicSources({ q, component, limit });
  const publicCount = LIBRARY_SOURCES.filter(isPublicLinkable).length;

  const components = LIBRARY_COMPONENTS
    .map((c) => {
      const n = LIBRARY_SOURCES.filter(
        (s) => s.component === c.id && isPublicLinkable(s)
      ).length;
      return { ...c, label: componentLabel(c.id), public: n, total: n };
    })
    .filter((c) => c.public > 0);

  return NextResponse.json({
    library: "military-library",
    classification: "UNCLASSIFIED // PUBLIC RESEARCH LITERATURE",
    provenance:
      "Public documents with verifiable http(s) URLs only. Offline catalog holdings are not listed. Presence is not endorsement or operational validation.",
    policy: "public-links-only",
    counts: {
      ...LIBRARY_COUNTS,
      public: publicCount,
      sources: publicCount,
      localOnly: 0,
      stub: 0,
    },
    components,
    returned: sources.length,
    sources,
  });
}
