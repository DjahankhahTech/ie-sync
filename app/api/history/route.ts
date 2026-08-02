import { NextRequest, NextResponse } from "next/server";
import { GCC_CONFIGS, type GCCId } from "@/lib/gcc-config";
import { historyEnabled, readSeries, type ProductKind } from "@/lib/history-store";

// Trend series over the append-only archive of generated AI products.
//
//   /api/history?gcc=INDOPACOM&days=30&product=analyze
//
// Returns real recorded snapshots only. When no database is provisioned, or
// when nothing has been recorded yet, `points` is empty and `enabled` says
// which of the two it is — the UI renders an honest empty state rather than
// substituting placeholder data.
//
// Must stay dynamic: the handler reads searchParams, and a prerendered
// (force-static) route would render once with empty params and silently ignore
// every filter.

export const dynamic = "force-dynamic";

const PRODUCTS: ProductKind[] = ["analyze", "sigman", "infsum"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const gcc = (searchParams.get("gcc") ?? "INDOPACOM") as GCCId;
  if (!GCC_CONFIGS[gcc]) {
    return NextResponse.json({ error: "Invalid GCC" }, { status: 400 });
  }

  const productParam = searchParams.get("product");
  if (productParam && !PRODUCTS.includes(productParam as ProductKind)) {
    return NextResponse.json(
      { error: `Invalid product — expected one of ${PRODUCTS.join(", ")}` },
      { status: 400 }
    );
  }
  const product = (productParam as ProductKind | null) ?? "analyze";

  const daysParam = searchParams.get("days");
  const parsedDays = daysParam ? Number.parseInt(daysParam, 10) : NaN;
  const days = Number.isFinite(parsedDays) ? Math.min(Math.max(parsedDays, 1), 365) : 30;

  const enabled = historyEnabled();
  const points = await readSeries({ gcc, product, days });

  return NextResponse.json({
    gcc,
    product,
    days,
    enabled,
    classification: "UNCLASSIFIED // OSINT",
    provenance:
      "Recorded snapshots of AI-generated DRAFT products. Each row is what the tool claimed at that time; forced regenerations do not overwrite it. Not a measured intelligence time series.",
    returned: points.length,
    points,
  });
}
