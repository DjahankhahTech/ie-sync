/**
 * Empty operational state. The app no longer ships fabricated theater
 * intelligence — threat entities, narratives, MOE/MOP, signatures, and
 * the running estimate all start EMPTY. They are populated from:
 *   - live OSINT (/api/feeds, /api/infsum, /api/media-feeds), and
 *   - the Claude-backed AI assessment (/api/analyze), via generateAssessment().
 * Modules with no real data source render an honest "no data" state until an
 * analyst connects a feed or enters data.
 */
import type {
  GCCId } from "./gcc-config";
import { GCC_CONFIGS } from "./gcc-config";
import type {
  SensorFeed,
  ThreatEntity,
  NarrativeThread,
  RunningEstimate,
  MOEMetric,
  MOPMetric,
  SignatureItem,
} from "./mock-data";

export interface GCCOperationalState {
  operationName: string;
  sensorFeeds: SensorFeed[];
  threatEntities: ThreatEntity[];
  narrativeThreads: NarrativeThread[];
  runningEstimate: RunningEstimate;
  moeMetrics: MOEMetric[];
  mopMetrics: MOPMetric[];
  signatureItems: SignatureItem[];
}

export function emptyRunningEstimate(gcc: GCCId): RunningEstimate {
  const cfg = GCC_CONFIGS[gcc];
  return {
    classification: "UNCLASSIFIED // OSINT",
    dtg: "",
    operationName: "",
    missionStatement: "",
    ieCondition: "UNCERTAIN",
    ieSituation: `No estimate yet for ${cfg?.aor ?? "the selected theater"}. Open Live OSINT so today's articles load, then press "Refresh from latest sources" above to draft one from current open-source reporting.`,
    adversaryCapabilities: [],
    friendlyCapabilities: [],
    assumptions: [],
    limitations: [],
    risks: [],
    recommendations: [],
    cdruObjective: "",
    priority: "IE3",
  };
}

export function emptyOperationalState(gcc: GCCId): GCCOperationalState {
  return {
    operationName: "",
    sensorFeeds: [],
    threatEntities: [],
    narrativeThreads: [],
    runningEstimate: emptyRunningEstimate(gcc),
    moeMetrics: [],
    mopMetrics: [],
    signatureItems: [],
  };
}
