"use client";

import { create } from "zustand";
import {
  type SensorFeed,
  type COAOption,
  type MOEMetric,
  type MOPMetric,
  type SignatureItem,
  type ThreatEntity,
  type NarrativeThread,
  type RunningEstimate,
  type ConcealRevealIndex,
  type SignatureRiskComposite,
  type AdversaryPerceptionState,
  type GrayZoneState,
  type ABMDState,
  type AnnexGeneration,
} from "@/lib/mock-data";
import { type GCCId } from "@/lib/gcc-config";
import { getGCCMockData } from "@/lib/gcc-mock-data";
import { type LiveFeedItem } from "@/app/api/feeds/route";

interface Alert {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  message: string;
  timestamp: string;
  acknowledged: boolean;
  source: string;
}

interface IEState {
  // Navigation
  activeModule: string;
  setActiveModule: (module: string) => void;

  // Geographic Command
  activeGCC: GCCId;
  setActiveGCC: (gcc: GCCId) => void;

  // Live feeds from API
  liveFeeds: LiveFeedItem[];
  liveFeedsLoading: boolean;
  liveFeedsError: string | null;
  liveFeedsFetchedAt: string | null;
  setLiveFeeds: (feeds: LiveFeedItem[], fetchedAt: string) => void;
  setLiveFeedsLoading: (loading: boolean) => void;
  setLiveFeedsError: (err: string | null) => void;

  // Static/mock sensor feeds
  feeds: SensorFeed[];
  anomalyCount: number;
  markFeedProcessed: (id: string) => void;

  // COA
  coaOptions: COAOption[];
  selectedCOA: string | null;
  setSelectedCOA: (id: string | null) => void;

  // MOE/MOP
  moeMetrics: MOEMetric[];
  mopMetrics: MOPMetric[];

  // Signatures
  signatureItems: SignatureItem[];

  // Threat Picture
  threatEntities: ThreatEntity[];
  narrativeThreads: NarrativeThread[];

  // Running Estimate
  runningEstimate: RunningEstimate;

  // Alerts
  alerts: Alert[];
  acknowledgeAlert: (id: string) => void;
  addAlert: (severity: Alert["severity"], message: string, source: string) => void;

  // Analyst triage — items escalated from live feeds
  escalatedItems: Array<{
    feedItemId: string;
    title: string;
    source: string;
    link: string;
    escalatedAt: string;
    tag: string;          // e.g. "NARRATIVE", "SIGACT", "THREAT"
    analystNote: string;
  }>;
  escalateFeedItem: (feedItemId: string, title: string, source: string, link: string, tag: string, analystNote: string) => void;

  // New module state
  concealRevealIndex: ConcealRevealIndex | null;
  signatureRisk: SignatureRiskComposite | null;
  adversaryPerceptions: AdversaryPerceptionState | null;
  grayZoneState: GrayZoneState | null;
  abmdState: ABMDState | null;
  setConcealRevealIndex: (data: ConcealRevealIndex | null) => void;
  setSignatureRisk: (data: SignatureRiskComposite | null) => void;
  setAdversaryPerceptions: (data: AdversaryPerceptionState | null) => void;
  setGrayZoneState: (data: GrayZoneState | null) => void;
  setABMDState: (data: ABMDState | null) => void;

  // Annex generation
  annexGenerating: boolean;
  annexGenProgress: number;
  lastGeneratedAnnex: {
    annexId: string;
    docType: string;
    content: string;
    metadata: AnnexGeneration;
    warnings: string[];
  } | null;
  setAnnexGenerating: (generating: boolean, progress?: number) => void;
  setLastGeneratedAnnex: (annex: IEState["lastGeneratedAnnex"]) => void;
  clearAnnexState: () => void;

  // System status
  lastRefresh: string;
  systemStatus: "ONLINE" | "DEGRADED" | "OFFLINE";
  aiStatus: "ACTIVE" | "TRAINING" | "ERROR";
  dataFusionStatus: "FUSING" | "IDLE" | "ERROR";
}

function buildAlertsForGCC(gcc: GCCId): Alert[] {
  const data = getGCCMockData(gcc);
  const re = data.runningEstimate;
  const criticalFeeds = data.sensorFeeds.filter((f) => f.threat === "CRITICAL");
  const highFeeds = data.sensorFeeds.filter((f) => f.threat === "HIGH");
  const redMoes = data.moeMetrics.filter((m) => m.status === "RED");

  const alerts: Alert[] = [];

  criticalFeeds.forEach((f, i) => {
    alerts.push({
      id: `ALT-${gcc}-CRIT-${i}`,
      severity: "CRITICAL",
      message: `CRITICAL: [${f.type}] ${f.content.substring(0, 100)}...`,
      timestamp: f.timestamp,
      acknowledged: false,
      source: f.source,
    });
  });

  highFeeds.slice(0, 2).forEach((f, i) => {
    alerts.push({
      id: `ALT-${gcc}-HIGH-${i}`,
      severity: "HIGH",
      message: `[${f.type}] ${f.content.substring(0, 100)}...`,
      timestamp: f.timestamp,
      acknowledged: false,
      source: f.source,
    });
  });

  redMoes.slice(0, 2).forEach((m, i) => {
    alerts.push({
      id: `ALT-${gcc}-MOE-${i}`,
      severity: "HIGH",
      message: `MOE BREACH: ${m.name} — current: ${m.current}${m.unit} (target: ${m.target}${m.unit}). Trend: ${m.trend}`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      source: "MOE Tracker",
    });
  });

  if (re.recommendations.length > 0) {
    alerts.push({
      id: `ALT-${gcc}-REC`,
      severity: "MEDIUM",
      message: `IE RECOMMENDATION: ${re.recommendations[0]}`,
      timestamp: new Date().toISOString(),
      acknowledged: true,
      source: "IO Planning Cell",
    });
  }

  return alerts;
}

const initialGCC: GCCId = "INDOPACOM";
const initialData = getGCCMockData(initialGCC);

export const useIEStore = create<IEState>((set) => ({
  activeModule: "cop",
  setActiveModule: (module) => set({ activeModule: module }),

  activeGCC: initialGCC,
  setActiveGCC: (gcc) => {
    const data = getGCCMockData(gcc);
    set({
      activeGCC: gcc,
      liveFeeds: [],
      liveFeedsFetchedAt: null,
      feeds: data.sensorFeeds,
      anomalyCount: data.sensorFeeds.filter((f) => f.anomaly).length,
      coaOptions: data.coaOptions,
      moeMetrics: data.moeMetrics,
      mopMetrics: data.mopMetrics,
      threatEntities: data.threatEntities,
      narrativeThreads: data.narrativeThreads,
      runningEstimate: data.runningEstimate,
      signatureItems: data.signatureItems,
      alerts: buildAlertsForGCC(gcc),
      selectedCOA: null,
      // Reset annex state on GCC switch
      annexGenerating: false,
      annexGenProgress: 0,
      lastGeneratedAnnex: null,
    });
  },

  liveFeeds: [],
  liveFeedsLoading: false,
  liveFeedsError: null,
  liveFeedsFetchedAt: null,
  setLiveFeeds: (feeds, fetchedAt) =>
    set({ liveFeeds: feeds, liveFeedsFetchedAt: fetchedAt, liveFeedsLoading: false, liveFeedsError: null }),
  setLiveFeedsLoading: (loading) => set({ liveFeedsLoading: loading }),
  setLiveFeedsError: (err) => set({ liveFeedsError: err, liveFeedsLoading: false }),

  feeds: initialData.sensorFeeds,
  anomalyCount: initialData.sensorFeeds.filter((f) => f.anomaly).length,
  markFeedProcessed: (id) =>
    set((state) => ({
      feeds: state.feeds.map((f) => (f.id === id ? { ...f, processed: true } : f)),
    })),

  coaOptions: initialData.coaOptions,
  selectedCOA: null,
  setSelectedCOA: (id) => set({ selectedCOA: id }),

  moeMetrics: initialData.moeMetrics,
  mopMetrics: initialData.mopMetrics,

  signatureItems: initialData.signatureItems,

  threatEntities: initialData.threatEntities,
  narrativeThreads: initialData.narrativeThreads,

  runningEstimate: initialData.runningEstimate,

  alerts: buildAlertsForGCC(initialGCC),
  acknowledgeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
    })),
  addAlert: (severity, message, source) =>
    set((state) => ({
      alerts: [
        {
          id: `ALERT-${Date.now()}`,
          severity,
          message,
          timestamp: new Date().toISOString(),
          acknowledged: false,
          source,
        },
        ...state.alerts,
      ],
    })),

  escalatedItems: [],
  escalateFeedItem: (feedItemId, title, source, link, tag, analystNote) =>
    set((state) => ({
      escalatedItems: [
        ...state.escalatedItems.filter((e) => e.feedItemId !== feedItemId), // dedupe
        {
          feedItemId,
          title,
          source,
          link,
          escalatedAt: new Date().toISOString(),
          tag,
          analystNote,
        },
      ],
    })),

  concealRevealIndex: null,
  signatureRisk: null,
  adversaryPerceptions: null,
  grayZoneState: null,
  abmdState: null,
  setConcealRevealIndex: (data) => set({ concealRevealIndex: data }),
  setSignatureRisk: (data) => set({ signatureRisk: data }),
  setAdversaryPerceptions: (data) => set({ adversaryPerceptions: data }),
  setGrayZoneState: (data) => set({ grayZoneState: data }),
  setABMDState: (data) => set({ abmdState: data }),

  annexGenerating: false,
  annexGenProgress: 0,
  lastGeneratedAnnex: null,
  setAnnexGenerating: (generating, progress) =>
    set({ annexGenerating: generating, annexGenProgress: progress ?? 0 }),
  setLastGeneratedAnnex: (annex) =>
    set({ lastGeneratedAnnex: annex, annexGenerating: false, annexGenProgress: 100 }),
  clearAnnexState: () =>
    set({ annexGenerating: false, annexGenProgress: 0, lastGeneratedAnnex: null }),

  lastRefresh: new Date().toISOString(),
  systemStatus: "ONLINE",
  aiStatus: "ACTIVE",
  dataFusionStatus: "FUSING",
}));
