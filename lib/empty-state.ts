/**
 * Empty operational state. The app no longer ships fabricated theater
 * intelligence — threat entities, narratives, COAs, MOE/MOP, signatures, and
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
  COAOption,
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
  coaOptions: COAOption[];
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
    ieSituation: `No assessment generated yet for the ${cfg?.aor ?? "selected"} AOR. Load the live OSINT feed, then run the AI assessment to draft an IE running estimate from current open-source reporting.`,
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
    coaOptions: [],
    moeMetrics: [],
    mopMetrics: [],
    signatureItems: [],
  };
}
