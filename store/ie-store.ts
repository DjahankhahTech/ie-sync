"use client";

import { create } from "zustand";
import {
  type SensorFeed,
  type MOEMetric,
  type MOPMetric,
  type SignatureItem,
  type ThreatEntity,
  type NarrativeThread,
  type RunningEstimate,
} from "@/lib/mock-data";
import { type GCCId } from "@/lib/gcc-config";
import { emptyOperationalState } from "@/lib/empty-state";
import { type LiveFeedItem } from "@/app/api/feeds/route";
import { type DailyINFSUM } from "@/app/api/infsum/route";

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

  // AI assessment (Claude, drafted from live OSINT via /api/analyze)
  assessment: AssessmentMeta | null;
  assessmentLoading: boolean;
  assessmentError: string | null;
  // AI-proposed potential measures (one-line statements, populated after an assessment)
  suggestedMOE: string[];
  suggestedMOP: string[];
  generateAssessment: (gcc: GCCId) => Promise<void>;

  // AI Executive Summary (INFSUM) — published once daily (0500 ET), prefetched in background
  aiSummary: AISummaryResult | null;
  aiSummaryLoading: boolean;
  aiSummaryError: string | null;
  loadAISummary: (gcc: GCCId) => Promise<void>;

  // SIGMAN open-source OPSEC scan — published once daily (0500 ET), prefetched in background
  sigman: SigmanResult | null;
  sigmanLoading: boolean;
  sigmanError: string | null;
  loadSigman: (gcc: GCCId) => Promise<void>;

  // Warm all three AI products (assessment, INFSUM summary, SIGMAN) for an AOR
  // in the background so tabs open already-populated (no first-visit spinner).
  prefetchAIProducts: (gcc: GCCId) => void;

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

  // Daily INFSUM
  infsum: DailyINFSUM | null;
  infsumLoading: boolean;
  infsumError: string | null;
  infsumFetchedAt: string | null;
  setINFSUM: (data: DailyINFSUM, fetchedAt: string) => void;
  setINFSUMLoading: (loading: boolean) => void;
  setINFSUMError: (err: string | null) => void;


  // System status
  lastRefresh: string;
  systemStatus: "ONLINE" | "DEGRADED" | "OFFLINE";
  aiStatus: "ACTIVE" | "TRAINING" | "ERROR";
  dataFusionStatus: "FUSING" | "IDLE" | "ERROR";
}

// AI assessment metadata — describes the last generated /api/analyze product.
export interface AssessmentMeta {
  generatedAt: string;
  model: string;
  classification: string;
  provenance: string;
  sourceCount: number;
}

// AI Executive Summary payload (/api/infsum-ai).
export interface AISummaryResult {
  summary: { bluf: string; keyDevelopments: string[]; ioThreatActivity: string[]; narrativeTrends: string[]; assessment: string; watchItems: string[] };
  references: Array<{ title: string; source: string; url: string; published: string }>;
  generatedAt: string;
  model: string;
  classification: string;
  sourceCount: number;
  day?: string;
  slot?: string;
}

// SIGMAN open-source OPSEC scan payload (/api/sigman).
export interface SigmanResult {
  generatedAt: string;
  model: string;
  classification: string;
  provenance: string;
  sourceCount: number;
  slot?: string;
  day?: string;
  assessment: {
    overallExposure: number;
    posture: string;
    summary: string;
    items: Array<{ category: "TECHNICAL" | "ADMINISTRATIVE" | "PHYSICAL" | "INFORMATIONAL"; indicator: string; exposure: string; riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; exposureScore: number; recommendation: string; sourceTitle: string; sourceUrl: string }>;
  };
}

// Alerts are derived from real signals (live feeds, generated assessments),
// not from fabricated theater data. Start empty.
/** Confidence is rendered as a percentage; keep it inside 0-100 whatever arrives. */
function clampConfidence(c: unknown): number {
  if (typeof c !== "number" || !Number.isFinite(c)) return 0;
  return Math.min(100, Math.max(0, Math.round(c)));
}

function buildAlertsForGCC(_gcc: GCCId): Alert[] {
  return [];
}

const initialGCC: GCCId = "INDOPACOM";
const initialData = emptyOperationalState(initialGCC);

export const useIEStore = create<IEState>((set, get) => ({
  activeModule: "home",
  setActiveModule: (module) => set({ activeModule: module }),

  activeGCC: initialGCC,
  setActiveGCC: (gcc) => {
    const data = emptyOperationalState(gcc);
    set({
      activeGCC: gcc,
      assessment: null,
      assessmentLoading: false,
      assessmentError: null,
      aiSummary: null,
      aiSummaryLoading: false,
      aiSummaryError: null,
      sigman: null,
      sigmanLoading: false,
      sigmanError: null,
      suggestedMOE: [],
      suggestedMOP: [],
      liveFeeds: [],
      liveFeedsFetchedAt: null,
      infsum: null,
      infsumFetchedAt: null,
      feeds: data.sensorFeeds,
      anomalyCount: data.sensorFeeds.filter((f) => f.anomaly).length,
      moeMetrics: data.moeMetrics,
      mopMetrics: data.mopMetrics,
      threatEntities: data.threatEntities,
      narrativeThreads: data.narrativeThreads,
      runningEstimate: data.runningEstimate,
      signatureItems: data.signatureItems,
      alerts: buildAlertsForGCC(gcc),
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

  moeMetrics: initialData.moeMetrics,
  mopMetrics: initialData.mopMetrics,

  signatureItems: initialData.signatureItems,

  threatEntities: initialData.threatEntities,
  narrativeThreads: initialData.narrativeThreads,

  runningEstimate: initialData.runningEstimate,

  assessment: null,
  assessmentLoading: false,
  assessmentError: null,
  suggestedMOE: [],
  suggestedMOP: [],
  generateAssessment: async (gcc) => {
    set({ assessmentLoading: true, assessmentError: null });
    try {
      // Cached daily assessment (server fetches OSINT + caches per ET-day);
      const res = await fetch(`/api/analyze?gcc=${gcc}`);
      const json = await res.json();
      if (!res.ok || json.error || !json.assessment) {
        set({ assessmentLoading: false, assessmentError: json.error ?? `Assessment failed (${res.status})` });
        return;
      }
      const a = json.assessment;
      const nowDtg = new Date().toISOString();

      const threatEntities: ThreatEntity[] = (a.threatEntities ?? []).map(
        (t: Omit<ThreatEntity, "id" | "grid" | "reportedAt"> & { confidence?: number }, i: number) => ({
          ...t,
          id: `TE-${gcc}-${i + 1}`,
          // No `grid`. Positions used to be synthesised from the array index and
          // mapped into the AOR box, which put entities at coordinates that had
          // nothing to do with their stated location and moved if the list was
          // reordered. The map now resolves the `location` string instead, and
          // simply does not plot entities whose location is not a real place.
          //
          // Not `lastSeen` either: the model cannot emit an observation time
          // (it is absent from the schema, which is additionalProperties:false),
          // so anything here is the report time, not a sighting.
          reportedAt: json.generatedAt,
          // The schema bounds this 0-100, but the value is rendered as a
          // percentage, so clamp rather than trust.
          confidence: clampConfidence(t.confidence),
        })
      );

      const narrativeThreads: NarrativeThread[] = (a.narrativeThreads ?? []).map(
        (n: Omit<NarrativeThread, "id">, i: number) => ({ ...n, id: `NT-${gcc}-${i + 1}` })
      );

      const runningEstimate: RunningEstimate = {
        classification: json.classification ?? "UNCLASSIFIED // OSINT",
        dtg: nowDtg,
        operationName: a.operationName ?? `${gcc} IE ASSESSMENT (OSINT)`,
        missionStatement: a.missionStatement ?? "",
        ieCondition: a.ieCondition ?? "UNCERTAIN",
        ieSituation: a.ieSituation ?? "",
        adversaryCapabilities: a.adversaryCapabilities ?? [],
        friendlyCapabilities: a.friendlyCapabilities ?? [],
        assumptions: a.assumptions ?? [],
        limitations: a.limitations ?? [],
        risks: a.risks ?? [],
        recommendations: a.recommendations ?? [],
        cdruObjective: a.cdruObjective ?? "",
        priority: a.priority ?? "IE3",
      };

      set({
        threatEntities,
        narrativeThreads,
        runningEstimate,
        suggestedMOE: Array.isArray(a.measuresOfEffectiveness) ? a.measuresOfEffectiveness : [],
        suggestedMOP: Array.isArray(a.measuresOfPerformance) ? a.measuresOfPerformance : [],
        assessmentLoading: false,
        assessmentError: null,
        assessment: {
          generatedAt: json.generatedAt,
          model: json.model,
          classification: json.classification,
          provenance: json.provenance,
          sourceCount: json.sourceCount,
        },
      });
    } catch (e) {
      set({ assessmentLoading: false, assessmentError: e instanceof Error ? e.message : "Assessment request failed" });
    }
  },

  aiSummary: null,
  aiSummaryLoading: false,
  aiSummaryError: null,
  loadAISummary: async (gcc) => {
    set({ aiSummaryLoading: true, aiSummaryError: null });
    try {
      const r = await fetch(`/api/infsum-ai?gcc=${gcc}`);
      const j = await r.json();
      if (!r.ok || j.error || !j.summary) {
        set({ aiSummaryLoading: false, aiSummaryError: j.error ?? `Summary unavailable (${r.status})` });
        return;
      }
      set({ aiSummary: j as AISummaryResult, aiSummaryLoading: false, aiSummaryError: null });
    } catch (e) {
      set({ aiSummaryLoading: false, aiSummaryError: e instanceof Error ? e.message : "Summary request failed" });
    }
  },

  sigman: null,
  sigmanLoading: false,
  sigmanError: null,
  loadSigman: async (gcc) => {
    set({ sigmanLoading: true, sigmanError: null });
    try {
      const r = await fetch(`/api/sigman?gcc=${gcc}`);
      const j = await r.json();
      if (!r.ok || j.error || !j.assessment) {
        set({ sigmanLoading: false, sigmanError: j.error ?? `Scan unavailable (${r.status})` });
        return;
      }
      set({ sigman: j as SigmanResult, sigmanLoading: false, sigmanError: null });
    } catch (e) {
      set({ sigmanLoading: false, sigmanError: e instanceof Error ? e.message : "Scan request failed" });
    }
  },

  prefetchAIProducts: (gcc) => {
    const s = get();
    if (!s.assessment && !s.assessmentLoading) s.generateAssessment(gcc);
    if (!s.aiSummary && !s.aiSummaryLoading) s.loadAISummary(gcc);
    if (!s.sigman && !s.sigmanLoading) s.loadSigman(gcc);
  },

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

  infsum: null,
  infsumLoading: false,
  infsumError: null,
  infsumFetchedAt: null,
  setINFSUM: (data, fetchedAt) =>
    set({ infsum: data, infsumFetchedAt: fetchedAt, infsumLoading: false, infsumError: null }),
  setINFSUMLoading: (loading) => set({ infsumLoading: loading }),
  setINFSUMError: (err) => set({ infsumError: err, infsumLoading: false }),


  lastRefresh: new Date().toISOString(),
  systemStatus: "ONLINE",
  aiStatus: "ACTIVE",
  dataFusionStatus: "FUSING",
}));
