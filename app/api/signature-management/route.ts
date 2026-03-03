import { NextResponse } from "next/server";
import type { SignatureRiskComposite, EMCONReading, OPSECViolation, SATVULWindow } from "@/lib/mock-data";
import type { GCCId } from "@/lib/gcc-config";

const GCC_PROFILES: Partial<Record<GCCId, { emcon: number; opsec: number; satvul: number }>> = {
  INDOPACOM: { emcon: 35, opsec: 28, satvul: 42 },
  CENTCOM: { emcon: 45, opsec: 52, satvul: 38 },
  EUCOM: { emcon: 22, opsec: 18, satvul: 32 },
  AFRICOM: { emcon: 30, opsec: 45, satvul: 25 },
  SOUTHCOM: { emcon: 15, opsec: 12, satvul: 18 },
  NORTHCOM: { emcon: 10, opsec: 8, satvul: 15 },
};

function jitter(base: number, range: number = 8): number {
  return Math.max(0, Math.min(100, Math.round(base + (Math.random() - 0.5) * range * 2)));
}

function generateEMCON(gcc: GCCId): EMCONReading[] {
  const emitters = ["HF Radio Array", "SATCOM Terminal", "Radar - AN/TPS-80", "UHF Tactical", "Link-16 Node", "WiFi AP (Unauthorized)"];
  return emitters.map((emitter, i) => {
    const reading = Math.round(5 + Math.random() * 25);
    const threshold = i < 4 ? 15 : 5;
    const status: EMCONReading["status"] =
      reading > threshold * 1.5 ? "VIOLATION" : reading > threshold ? "ELEVATED" : reading > threshold * 0.5 ? "NORMAL" : reading > 2 ? "LOW" : "SILENT";
    return {
      id: `EMCON-${gcc}-${i}`,
      emitter,
      status,
      reading_dbm: reading,
      threshold_dbm: threshold,
      location: `Site ${String.fromCharCode(65 + i)}`,
      timestamp: new Date().toISOString(),
    };
  });
}

function generateOPSEC(gcc: GCCId): OPSECViolation[] {
  const violations: Array<Pick<OPSECViolation, "category" | "severity" | "description" | "unit" | "remediation">> = [
    { category: "SOCIAL_MEDIA", severity: "HIGH", description: "Geo-tagged photos posted near restricted area", unit: "3/7 MIG HQ", remediation: "OPSEC brief required; restrict device use in controlled areas" },
    { category: "COMMS", severity: "CRITICAL", description: "Unencrypted voice comms on tactical frequency", unit: "Signal Co", remediation: "Enforce COMSEC procedures; re-key all affected nets" },
    { category: "DIGITAL", severity: "MEDIUM", description: "Unsecured USB device connected to classified terminal", unit: "S6 Section", remediation: "Device confiscated; full scan of terminal required" },
    { category: "PHYSICAL", severity: "LOW", description: "Predictable vehicle movement pattern (Gate 2)", unit: "Motor-T", remediation: "Randomize routes and timing per OPSEC SOP" },
    { category: "ADMINISTRATIVE", severity: "MEDIUM", description: "Classified meeting minutes sent via unclass email", unit: "Admin Section", remediation: "Data spill procedures initiated; wipe all unclass copies" },
  ];

  return violations.slice(0, 3 + Math.floor(Math.random() * 3)).map((v, i) => ({
    ...v,
    id: `OPSEC-${gcc}-${i}`,
    timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    resolved: Math.random() > 0.6,
  }));
}

function generateSATVUL(): SATVULWindow[] {
  const sats = [
    { satellite: "YAOGAN-35 (PRC EO)", sensorType: "OPTICAL" as const },
    { satellite: "GAOFEN-12 (PRC SAR)", sensorType: "SAR" as const },
    { satellite: "COSMOS 2558 (RUS ELINT)", sensorType: "ELINT" as const },
    { satellite: "JILIN-1 (PRC Commercial EO)", sensorType: "OPTICAL" as const },
    { satellite: "SAR-LUPE 4 (Dual-use SAR)", sensorType: "SAR" as const },
  ];

  const now = Date.now();
  return sats.map((sat, i) => {
    const passStart = new Date(now + (1 + Math.random() * 12) * 3600000).toISOString();
    const passEnd = new Date(new Date(passStart).getTime() + (5 + Math.random() * 10) * 60000).toISOString();
    const risk: SATVULWindow["riskLevel"] = Math.random() > 0.6 ? "HIGH" : Math.random() > 0.3 ? "MEDIUM" : "LOW";
    const mitigation: SATVULWindow["mitigationStatus"] = risk === "HIGH" ? (Math.random() > 0.5 ? "PENDING" : "UNMITIGATED") : "MITIGATED";
    return {
      id: `SAT-${i}`,
      satellite: sat.satellite,
      passStart,
      passEnd,
      elevationDeg: Math.round(15 + Math.random() * 70),
      sensorType: sat.sensorType,
      riskLevel: risk,
      mitigationStatus: mitigation,
    };
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gcc = (searchParams.get("gcc") || "INDOPACOM") as GCCId;
  const profile = GCC_PROFILES[gcc] ?? GCC_PROFILES.INDOPACOM!;

  const emconReadings = generateEMCON(gcc);
  const opsecViolations = generateOPSEC(gcc);
  const satvulWindows = generateSATVUL();

  const emconScore = jitter(profile.emcon);
  const opsecScore = jitter(profile.opsec);
  const satvulScore = jitter(profile.satvul);
  const composite = Math.round(emconScore * 0.35 + opsecScore * 0.35 + satvulScore * 0.30);

  const status: SignatureRiskComposite["status"] = composite > 55 ? "RED" : composite > 25 ? "AMBER" : "GREEN";

  const result: SignatureRiskComposite = {
    composite,
    status,
    emconScore,
    opsecScore,
    satvulScore,
    emconReadings,
    opsecViolations,
    satvulWindows,
    computedAt: new Date().toISOString(),
  };

  return NextResponse.json(result);
}
