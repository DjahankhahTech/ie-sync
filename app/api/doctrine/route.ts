import { NextRequest, NextResponse } from "next/server";
import {
  searchLibrary,
  componentLabel,
  LIBRARY_COMPONENTS,
  LIBRARY_COUNTS,
  type LibraryAccess,
} from "@/lib/military-library";

// Doctrine / research library browser over the catalogued military-library
// corpus. Metadata only — the PDFs live on the offline library drive, so
// entries carry a link when the catalog holds a public URL and are
// reference-only when it does not.
//
//   /api/doctrine                                  → components + counts
//   /api/doctrine?q=ukraine&component=...&access=public&limit=50
//
// Must stay dynamic: the handler reads searchParams, and a prerendered
// (force-static) route would render once with empty params and silently ignore
// every filter. Filtering is an in-memory pass over a committed build artifact,
// so there is no I/O cost to being dynamic.

export const dynamic = "force-dynamic";

const ACCESS_VALUES: LibraryAccess[] = ["public", "local-only", "stub"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q") ?? undefined;
  const component = searchParams.get("component") ?? undefined;
  const accessParam = searchParams.get("access");
  const limitParam = searchParams.get("limit");

  if (component && !LIBRARY_COMPONENTS.some((c) => c.id === component)) {
    return NextResponse.json({ error: `Unknown component "${component}"` }, { status: 400 });
  }
  if (accessParam && !ACCESS_VALUES.includes(accessParam as LibraryAccess)) {
    return NextResponse.json(
      { error: `Invalid access filter — expected one of ${ACCESS_VALUES.join(", ")}` },
      { status: 400 }
    );
  }

  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : NaN;
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 200;

  const sources = searchLibrary({
    q,
    component,
    access: (accessParam as LibraryAccess | null) ?? undefined,
    limit,
  });

  return NextResponse.json({
    library: "military-library",
    classification: "UNCLASSIFIED // PUBLIC RESEARCH LITERATURE",
    provenance:
      "Catalogued public research corpus. Presence in the library is not endorsement, validation, or evidence of operational effectiveness. Documents without a public URL are held offline and are cited by reference only.",
    counts: LIBRARY_COUNTS,
    components: LIBRARY_COMPONENTS.map((c) => ({ ...c, label: componentLabel(c.id) })),
    returned: sources.length,
    sources,
  });
}
