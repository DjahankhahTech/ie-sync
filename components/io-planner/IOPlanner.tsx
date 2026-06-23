"use client";

import { useState } from "react";
import { useIEStore } from "@/store/ie-store";
import { GlossaryPanel } from "@/components/ui/GlossaryPanel";

// ── Forces across the Range of IO (Information-Related Capabilities) ──────────
const IRC_ROSTER: { capability: string; hint: string }[] = [
  { capability: "MISO / PSYOP", hint: "e.g., POG MISO Co; COMMANDO SOLO (EC-130J)" },
  { capability: "Electronic Warfare (EW)", hint: "e.g., EC-130H Compass Call; EA-18G Growler" },
  { capability: "Cyberspace Operations", hint: "e.g., CMT/CPT; CYBERCOM DCO element" },
  { capability: "Public Affairs (PA)", hint: "e.g., Theater PAO; combat camera" },
  { capability: "Military Deception (MILDEC)", hint: "e.g., deception planning cell" },
  { capability: "Operations Security (OPSEC)", hint: "e.g., theater OPSEC cell; SIGMAN" },
  { capability: "Civil-Military Operations (CMO)", hint: "e.g., Civil Affairs Bn / CA team" },
  { capability: "Space Operations", hint: "e.g., space support element; SATCOM / PNT" },
  { capability: "Intelligence / ISR", hint: "e.g., RC-135; SOCMINT cell; analytic support" },
  { capability: "Key Leader Engagement (KLE)", hint: "e.g., CDR/staff engagements; LNOs" },
  { capability: "Special Technical Operations (STO)", hint: "e.g., STO planner" },
];

interface ForceRow { capability: string; available: boolean; units: string }
interface Worksheet {
  operationName: string;
  mission: string;
  intent: string;
  priority: string;
  audiences: string[];
  effects: string[];
  messages: string[];
  timing: string;
  constraints: string;
}
interface PlanTask { capability: string; task: string; unit: string; nlt: string; authority: string; moeSupported: string }
interface PlanPhase { name: string; timing: string; tasks: PlanTask[] }
interface COA {
  name: string; objective: string; targetAudience: string; capabilities: string[];
  successProbability: number; risk: string; estimatedEffect: string; resourceRequirement: string;
  phases: PlanPhase[]; measuresOfEffectiveness: string[]; measuresOfPerformance: string[];
  assumptions: string[]; risksMitigations: { risk: string; mitigation: string }[];
  authorities: { action: string; authority: string; status: string }[];
}
interface PlanResult {
  generatedAt: string; model: string; classification: string; provenance: string;
  plan: { coa: COA; annexI: string; itco: string };
}

const riskColor = (r: string) =>
  r === "CRITICAL" ? "#ef4444" : r === "HIGH" ? "#f59e0b" : r === "MEDIUM" ? "#eab308" : "#10b981";

export function IOPlanner() {
  const { activeGCC, threatEntities, narrativeThreads, runningEstimate, liveFeeds, setLiveFeeds } = useIEStore();
  const [tab, setTab] = useState<"builder" | "products">("builder");

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMeta, setAiMeta] = useState<{ generatedAt: string; model: string; classification: string; sourceCount: number } | null>(null);

  const [ws, setWs] = useState<Worksheet>({
    operationName: runningEstimate.operationName || "",
    mission: runningEstimate.missionStatement || "",
    intent: runningEstimate.cdruObjective || "",
    priority: runningEstimate.priority || "IE3",
    audiences: [],
    effects: [],
    messages: [],
    timing: "",
    constraints: "",
  });
  const [forces, setForces] = useState<ForceRow[]>(
    IRC_ROSTER.map((r) => ({ capability: r.capability, available: false, units: "" }))
  );
  const [result, setResult] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (k: keyof Worksheet, v: string) => setWs((p) => ({ ...p, [k]: v }));
  const addItem = (k: "audiences" | "effects" | "messages", v: string) => {
    const t = v.trim();
    if (!t) return;
    setWs((p) => ({ ...p, [k]: [...p[k], t] }));
  };
  const removeItem = (k: "audiences" | "effects" | "messages", i: number) =>
    setWs((p) => ({ ...p, [k]: p[k].filter((_, idx) => idx !== i) }));
  const toggleForce = (i: number) =>
    setForces((p) => p.map((f, idx) => (idx === i ? { ...f, available: !f.available } : f)));
  const setForceUnits = (i: number, v: string) =>
    setForces((p) => p.map((f, idx) => (idx === i ? { ...f, units: v } : f)));

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gcc: activeGCC,
          worksheet: ws,
          forces,
          threats: threatEntities.map((t) => ({ designation: t.designation, activity: t.activity })),
          narratives: narrativeThreads.map((n) => ({ title: n.title })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? `Planning failed (${res.status})`); setLoading(false); return; }
      setResult(json);
      setTab("products");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Planning request failed");
    } finally {
      setLoading(false);
    }
  };

  // AI auto-fill: draft the whole worksheet + suggested forces from the latest OSINT.
  const aiFill = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      let feeds = liveFeeds;
      if (feeds.length === 0) {
        const fr = await fetch(`/api/feeds?gcc=${activeGCC}&ioOnly=true`);
        if (fr.ok) {
          const fj = await fr.json();
          feeds = fj.items ?? [];
          if (feeds.length) setLiveFeeds(feeds, fj.fetchedAt ?? new Date().toISOString());
        }
      }
      const res = await fetch("/api/draft-worksheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gcc: activeGCC,
          feedItems: feeds.slice(0, 40).map((f) => ({ title: f.title, summary: f.summary, source: f.source, published: f.published })),
          threats: threatEntities.map((t) => ({ designation: t.designation, activity: t.activity })),
          narratives: narrativeThreads.map((n) => ({ title: n.title })),
          refinement: aiPrompt.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setAiError(json.error ?? `Draft failed (${res.status})`); setAiLoading(false); return; }
      const d = json.worksheet;
      setWs({
        operationName: d.operationName || "",
        mission: d.mission || "",
        intent: d.intent || "",
        priority: d.priority || "IE3",
        audiences: d.audiences || [],
        effects: d.effects || [],
        messages: d.messages || [],
        timing: d.timing || "",
        constraints: d.constraints || "",
      });
      setForces((prev) =>
        prev.map((f) => {
          const m = (d.forces || []).find((x: ForceRow) => x.capability === f.capability);
          return m ? { capability: f.capability, available: !!m.available, units: m.units || "" } : f;
        })
      );
      setAiMeta({ generatedAt: json.generatedAt, model: json.model, classification: json.classification, sourceCount: json.sourceCount });
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Draft request failed");
    } finally {
      setAiLoading(false);
    }
  };

  const availableCount = forces.filter((f) => f.available).length;

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4">
      {/* Header */}
      <div>
        <div className="text-[#00d4ff] text-sm font-black tracking-widest">IO PLANNER</div>
        <div className="text-[#475569] text-xs font-mono">
          OIE course-of-action worksheet → detailed COA, Annex I (Information), and ITCO — drafted by Claude (Opus 4.8) from your inputs, available forces, and the AO threat picture.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#1e3a5f]">
        {(["builder", "products"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setTab(m)}
            className={`px-5 py-2 text-xs font-bold tracking-widest transition-colors border-b-2 ${
              tab === m ? "border-[#00d4ff] text-[#00d4ff]" : "border-transparent text-[#475569] hover:text-[#94a3b8]"
            }`}
          >
            {m === "builder" ? "BUILDER" : "PRODUCTS"}
            {m === "products" && result ? " ●" : ""}
          </button>
        ))}
      </div>

      {tab === "builder" && (
        <>
          {/* AI worksheet assistant — fills the worksheet from the latest OSINT, then refine by hand */}
          <div className="tactical-card p-4 border border-[#0891b2] space-y-2">
            <div className="text-[#00d4ff] text-xs font-bold tracking-widest">AI WORKSHEET ASSISTANT</div>
            <div className="text-[10px] text-[#475569]">
              Auto-fill the worksheet and suggested forces from the latest OSINT &amp; AO threat picture — then refine everything by hand. Optional: add guidance to steer the draft.
            </div>
            <div className="flex gap-2">
              <input
                className="planner-input"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); aiFill(); } }}
                placeholder="Optional guidance — e.g., 'counter PRC disinformation; emphasize Taiwan & alliance messaging'"
              />
              <button
                onClick={aiFill}
                disabled={aiLoading}
                className="px-4 py-2 text-xs bg-[#1e3a5f] border border-[#00d4ff] text-[#00d4ff] rounded hover:bg-[#00d4ff15] disabled:opacity-50 font-bold tracking-wider flex-shrink-0"
              >
                {aiLoading ? "DRAFTING…" : aiMeta ? "RE-DRAFT" : "AI FILL FROM OSINT"}
              </button>
            </div>
            {aiError && (
              <div className="p-2 border border-[#ef4444] bg-[#ef444410] rounded text-[11px] text-[#ef4444] font-mono">✗ {aiError}</div>
            )}
            {aiMeta && (
              <div className="text-[10px] text-[#94a3b8]">
                <span className="text-[#f59e0b] font-bold">{aiMeta.classification} · AI-DRAFT</span> — drafted from {aiMeta.sourceCount} OSINT sources {new Date(aiMeta.generatedAt).toLocaleString()} · {aiMeta.model}. Every field below is editable — refine before generating, or re-draft with new guidance.
              </div>
            )}
          </div>

          {/* Worksheet */}
          <div className="tactical-card p-4 space-y-3">
            <div className="text-[#00d4ff] text-xs font-bold tracking-widest">PLANNING WORKSHEET — FILL IN</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="OPERATION NAME">
                <input className="planner-input" value={ws.operationName} onChange={(e) => setField("operationName", e.target.value)} placeholder="e.g., OPERATION PACIFIC SENTINEL" />
              </Field>
              <Field label="IO PRIORITY">
                <select className="planner-input" value={ws.priority} onChange={(e) => setField("priority", e.target.value)}>
                  <option value="IE1">IE1 — highest</option>
                  <option value="IE2">IE2</option>
                  <option value="IE3">IE3</option>
                </select>
              </Field>
            </div>
            <Field label="MISSION (who/what/when/where/why)">
              <textarea className="planner-input h-16" value={ws.mission} onChange={(e) => setField("mission", e.target.value)} placeholder="State the IO mission…" />
            </Field>
            <Field label="COMMANDER'S INTENT / IE OBJECTIVE">
              <textarea className="planner-input h-16" value={ws.intent} onChange={(e) => setField("intent", e.target.value)} placeholder="Purpose, key tasks, end state for the information environment…" />
            </Field>
            <AddList label="TARGET AUDIENCES" placeholder="Add a target audience…" items={ws.audiences} onAdd={(v) => addItem("audiences", v)} onRemove={(i) => removeItem("audiences", i)} />
            <AddList label="DESIRED EFFECTS" placeholder="Add a desired effect…" items={ws.effects} onAdd={(v) => addItem("effects", v)} onRemove={(i) => removeItem("effects", i)} />
            <AddList label="KEY MESSAGES / THEMES" placeholder="Add a message or theme…" items={ws.messages} onAdd={(v) => addItem("messages", v)} onRemove={(i) => removeItem("messages", i)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="TIMING & PHASING">
                <textarea className="planner-input h-16" value={ws.timing} onChange={(e) => setField("timing", e.target.value)} placeholder="H-hour, phases, decision points…" />
              </Field>
              <Field label="CONSTRAINTS & AUTHORITIES">
                <textarea className="planner-input h-16" value={ws.constraints} onChange={(e) => setField("constraints", e.target.value)} placeholder="ROE, restraints, approval authorities, deconfliction…" />
              </Field>
            </div>
          </div>

          {/* Available forces */}
          <div className="tactical-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[#00d4ff] text-xs font-bold tracking-widest">AVAILABLE FORCES — RANGE OF INFORMATION OPERATIONS</div>
              <div className="text-[10px] text-[#475569] font-mono">{availableCount} IRC(s) available</div>
            </div>
            <div className="text-[10px] text-[#475569]">Check each information-related capability you have and assign the specific unit/platform. The planner tasks only what you mark available.</div>
            <div className="space-y-1.5">
              {forces.map((f, i) => (
                <div key={f.capability} className={`flex items-center gap-3 p-2 border rounded ${f.available ? "border-[#10b981] bg-[#10b98108]" : "border-[#1e3a5f] bg-[#070d1a]"}`}>
                  <button
                    onClick={() => toggleForce(i)}
                    className={`flex-shrink-0 w-4 h-4 border rounded flex items-center justify-center text-[9px] font-bold ${f.available ? "border-[#10b981] bg-[#10b98130] text-[#10b981]" : "border-[#334155] text-[#334155]"}`}
                    aria-label={`toggle ${f.capability}`}
                  >
                    {f.available ? "✓" : ""}
                  </button>
                  <div className="w-56 flex-shrink-0 text-[11px] font-bold text-[#94a3b8]">{f.capability}</div>
                  <input
                    className="planner-input flex-1 text-[11px]"
                    value={f.units}
                    disabled={!f.available}
                    onChange={(e) => setForceUnits(i, e.target.value)}
                    placeholder={IRC_ROSTER[i].hint}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-2 border border-[#ef4444] bg-[#ef444410] rounded text-[11px] text-[#ef4444] font-mono">✗ {error}</div>
          )}
          {threatEntities.length === 0 && (
            <div className="p-2 border border-[#f59e0b50] bg-[#f59e0b08] rounded text-[10px] text-[#94a3b8]">
              ⚑ No AO threat picture loaded. Run the AI Assessment (Running Estimate tab) first so the COA can target real threats &amp; narratives.
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading}
            className="w-full px-4 py-3 text-xs bg-[#1e3a5f] border border-[#00d4ff] text-[#00d4ff] rounded hover:bg-[#00d4ff15] disabled:opacity-50 font-bold tracking-widest"
          >
            {loading ? "PLANNING — DRAFTING COA, ANNEX I & ITCO…" : "GENERATE COA · ANNEX I · ITCO"}
          </button>
        </>
      )}

      {tab === "products" && (
        <ProductsView result={result} onBack={() => setTab("builder")} />
      )}

      <GlossaryPanel module="annex" />

      <style jsx>{`
        :global(.planner-input) {
          width: 100%;
          background: #070d1a;
          border: 1px solid #1e3a5f;
          border-radius: 6px;
          padding: 7px 9px;
          color: #e2e8f0;
          font-size: 12px;
          outline: none;
        }
        :global(.planner-input:focus) { border-color: #0891b2; }
        :global(.planner-input:disabled) { opacity: 0.4; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] text-[#475569] tracking-wider mb-1">{label}</div>
      {children}
    </div>
  );
}

function AddList({ label, placeholder, items, onAdd, onRemove }: {
  label: string; placeholder: string; items: string[]; onAdd: (v: string) => void; onRemove: (i: number) => void;
}) {
  const [val, setVal] = useState("");
  const commit = () => { onAdd(val); setVal(""); };
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          className="planner-input"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
          placeholder={placeholder}
        />
        <button onClick={commit} className="px-3 py-1 text-[11px] border border-[#0891b2] text-[#00d4ff] rounded hover:bg-[#0891b215] font-bold flex-shrink-0">ADD</button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {items.map((it, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-[#1e3a5f40] border border-[#1e3a5f] rounded text-[#94a3b8]">
              {it}
              <button onClick={() => onRemove(i)} className="text-[#475569] hover:text-[#ef4444]">×</button>
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}

function ProductsView({ result, onBack }: { result: PlanResult | null; onBack: () => void }) {
  const { runningEstimate, threatEntities, narrativeThreads } = useIEStore();
  const [pptxBusy, setPptxBusy] = useState(false);

  const buildBrief = async () => {
    if (!result) return;
    setPptxBusy(true);
    try {
      const PptxGenJS = (await import("pptxgenjs")).default;
      const coa = result.plan.coa;
      const BG = "0A0E1A", ACC = "00D4FF", TXT = "E2E8F0", MUT = "94A3B8", GOLD = "F59E0B", LINE = "1E3A5F";
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
      pptx.author = "IE-SYNC";
      pptx.title = `${runningEstimate.operationName || coa.name} — IO Brief`;

      const slide = (title?: string) => {
        const s = pptx.addSlide();
        s.background = { color: BG };
        s.addText(result.classification, { x: 0, y: 0.1, w: "100%", align: "center", fontSize: 9, color: GOLD, bold: true, charSpacing: 2 });
        s.addText("UNCLASSIFIED // OSINT · AI-DRAFT — HUMAN REVIEW REQUIRED", { x: 0, y: 7.15, w: "100%", align: "center", fontSize: 7, color: MUT });
        if (title) {
          s.addText(title, { x: 0.5, y: 0.45, w: 12.3, h: 0.6, fontSize: 24, color: ACC, bold: true });
          s.addText("", { x: 0.5, y: 1.08, w: 12.3, h: 0.02, fill: { color: ACC } });
        }
        return s;
      };
      const bullets = (arr: string[], opts: Record<string, unknown>) => arr.length
        ? arr.map((t) => ({ text: t, options: { bullet: true } }))
        : [{ text: "—", options: {} }];

      // 1. Title
      const t = pptx.addSlide();
      t.background = { color: BG };
      t.addText(result.classification, { x: 0, y: 0.2, w: "100%", align: "center", fontSize: 12, color: GOLD, bold: true, charSpacing: 3 });
      t.addText(runningEstimate.operationName || coa.name, { x: 0.5, y: 2.6, w: 12.3, h: 1, fontSize: 40, color: ACC, bold: true, align: "center" });
      t.addText("INFORMATION OPERATIONS — COMMANDER'S DECISION BRIEF", { x: 0.5, y: 3.7, w: 12.3, h: 0.5, fontSize: 18, color: TXT, align: "center", charSpacing: 1 });
      t.addText(`IE Condition: ${runningEstimate.ieCondition}   ·   IO Priority: ${runningEstimate.priority}`, { x: 0.5, y: 4.4, w: 12.3, fontSize: 14, color: MUT, align: "center" });
      t.addText(`Generated ${new Date(result.generatedAt).toLocaleString()} · ${result.model}\nAI-DRAFT — requires human analyst validation before briefing or execution`, { x: 0.5, y: 6.3, w: 12.3, fontSize: 9, color: MUT, align: "center" });

      // 2. Situation
      const s2 = slide("SITUATION — INFORMATION ENVIRONMENT");
      s2.addText(runningEstimate.ieSituation || "See running estimate.", { x: 0.5, y: 1.2, w: 12.3, h: 1.4, fontSize: 12, color: TXT, valign: "top" });
      s2.addText("THREAT ENTITIES (AO)", { x: 0.5, y: 2.7, w: 6, fontSize: 12, color: GOLD, bold: true });
      s2.addText(bullets(threatEntities.slice(0, 6).map((x) => `${x.designation} — ${x.activity} [${x.threat}]`), {}), { x: 0.5, y: 3.0, w: 6.1, h: 3.7, fontSize: 11, color: TXT, valign: "top" });
      s2.addText("HOSTILE NARRATIVES", { x: 6.8, y: 2.7, w: 6, fontSize: 12, color: GOLD, bold: true });
      s2.addText(bullets(narrativeThreads.slice(0, 6).map((n) => `"${n.title}" (${n.platform}) — ${n.trend}`), {}), { x: 6.8, y: 3.0, w: 6, h: 3.7, fontSize: 11, color: TXT, valign: "top" });

      // 3. Mission & Intent
      const s3 = slide("MISSION & COMMANDER'S INTENT");
      s3.addText("MISSION", { x: 0.5, y: 1.2, w: 12, fontSize: 13, color: GOLD, bold: true });
      s3.addText(runningEstimate.missionStatement || coa.objective, { x: 0.5, y: 1.55, w: 12.3, h: 1.6, fontSize: 13, color: TXT, valign: "top" });
      s3.addText("COMMANDER'S IE OBJECTIVE", { x: 0.5, y: 3.4, w: 12, fontSize: 13, color: GOLD, bold: true });
      s3.addText(runningEstimate.cdruObjective || coa.objective, { x: 0.5, y: 3.75, w: 12.3, h: 1.6, fontSize: 13, color: TXT, valign: "top" });

      // 4. Recommended COA
      const s4 = slide("RECOMMENDED COURSE OF ACTION");
      s4.addText(coa.name, { x: 0.5, y: 1.2, w: 12.3, fontSize: 18, color: ACC, bold: true });
      s4.addText([
        { text: "Objective: ", options: { bold: true, color: GOLD } }, { text: `${coa.objective}\n`, options: {} },
        { text: "Target audience: ", options: { bold: true, color: GOLD } }, { text: `${coa.targetAudience}\n`, options: {} },
        { text: "Capabilities: ", options: { bold: true, color: GOLD } }, { text: `${coa.capabilities.join(", ")}\n`, options: {} },
        { text: "Estimated effect: ", options: { bold: true, color: GOLD } }, { text: `${coa.estimatedEffect}\n`, options: {} },
        { text: "Resourcing: ", options: { bold: true, color: GOLD } }, { text: `${coa.resourceRequirement}`, options: {} },
      ], { x: 0.5, y: 1.7, w: 12.3, h: 3.5, fontSize: 13, color: TXT, valign: "top" });
      s4.addText(`SUCCESS PROBABILITY ${coa.successProbability}%   ·   RISK: ${coa.risk}`, { x: 0.5, y: 6.3, w: 12.3, fontSize: 14, color: ACC, bold: true });

      // 5. Scheme of IO — phases
      const s5 = slide("SCHEME OF IO — PHASED EXECUTION");
      const phaseLines: { text: string; options: Record<string, unknown> }[] = [];
      coa.phases.forEach((ph) => {
        phaseLines.push({ text: `${ph.name}  (${ph.timing})`, options: { bold: true, color: ACC, fontSize: 13, paraSpaceBefore: 8 } });
        ph.tasks.forEach((tk) => phaseLines.push({ text: `[${tk.capability}] ${tk.task}  — ${tk.unit}, NLT ${tk.nlt}`, options: { bullet: true, color: TXT, fontSize: 10 } }));
      });
      s5.addText(phaseLines.length ? phaseLines : [{ text: "—", options: {} }], { x: 0.5, y: 1.2, w: 12.3, h: 5.6, fontSize: 11, color: TXT, valign: "top" });

      // 6. Assessment & Risk
      const s6 = slide("ASSESSMENT & RISK");
      s6.addText("MEASURES OF EFFECTIVENESS", { x: 0.5, y: 1.2, w: 6, fontSize: 12, color: GOLD, bold: true });
      s6.addText(bullets(coa.measuresOfEffectiveness, {}), { x: 0.5, y: 1.5, w: 6.1, h: 2.3, fontSize: 10, color: TXT, valign: "top" });
      s6.addText("MEASURES OF PERFORMANCE", { x: 6.8, y: 1.2, w: 6, fontSize: 12, color: GOLD, bold: true });
      s6.addText(bullets(coa.measuresOfPerformance, {}), { x: 6.8, y: 1.5, w: 6, h: 2.3, fontSize: 10, color: TXT, valign: "top" });
      s6.addText("RISKS & MITIGATIONS", { x: 0.5, y: 4.0, w: 12, fontSize: 12, color: GOLD, bold: true });
      s6.addText(bullets(coa.risksMitigations.map((r) => `${r.risk} → ${r.mitigation}`), {}), { x: 0.5, y: 4.3, w: 12.3, h: 2.5, fontSize: 10, color: TXT, valign: "top" });

      await pptx.writeFile({ fileName: `${(runningEstimate.operationName || coa.name).replace(/[^\w]+/g, "_")}_IO_Brief.pptx` });
    } finally {
      setPptxBusy(false);
    }
  };

  if (!result) {
    return (
      <div className="tactical-card p-8 text-center">
        <div className="text-[#1e3a5f] text-4xl mb-3">◧</div>
        <div className="text-[#475569] text-sm mb-1">No plan generated yet</div>
        <div className="text-[#334155] text-xs max-w-md mx-auto">Fill in the worksheet and mark your available forces in the Builder tab, then generate. The COA, Annex I, and ITCO will appear here.</div>
        <button onClick={onBack} className="mt-4 px-4 py-2 text-xs border border-[#0891b2] text-[#00d4ff] rounded hover:bg-[#0891b215] font-bold">← BACK TO BUILDER</button>
      </div>
    );
  }
  const { coa } = result.plan;
  return (
    <div className="space-y-4">
      {/* Provenance */}
      <div className="p-3 border border-[#f59e0b50] bg-[#f59e0b08] rounded text-[10px] text-[#94a3b8] flex items-start gap-2">
        <span className="text-[#f59e0b] flex-shrink-0">⚑</span>
        <div>
          <span className="text-[#f59e0b] font-bold">{result.classification} · AI-DRAFT — </span>
          {result.provenance} Generated {new Date(result.generatedAt).toLocaleString()} · {result.model}.
        </div>
      </div>

      {/* Product actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={buildBrief}
          disabled={pptxBusy}
          className="px-4 py-2 text-xs bg-[#1e3a5f] border border-[#00d4ff] text-[#00d4ff] rounded hover:bg-[#00d4ff15] disabled:opacity-50 font-bold tracking-wider"
        >
          {pptxBusy ? "BUILDING…" : "⬇ COMMANDER'S BRIEF (.PPTX)"}
        </button>
        <span className="text-[10px] text-[#475569] self-center">6-slide decision brief: situation · mission · COA · scheme of IO · assessment</span>
      </div>

      {/* COA */}
      <div className="tactical-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[#00d4ff] text-xs font-bold tracking-widest">RECOMMENDED COURSE OF ACTION</div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-[#475569]">Success</span>
            <span className="text-[#10b981] font-bold">{coa.successProbability}%</span>
            <span className="px-2 py-0.5 border rounded font-bold" style={{ borderColor: riskColor(coa.risk), color: riskColor(coa.risk) }}>{coa.risk} RISK</span>
          </div>
        </div>
        <div className="text-[#e2e8f0] font-bold">{coa.name}</div>
        <div className="text-[11px] text-[#94a3b8]"><span className="text-[#475569]">Objective:</span> {coa.objective}</div>
        <div className="text-[11px] text-[#94a3b8]"><span className="text-[#475569]">Target audience:</span> {coa.targetAudience}</div>
        <div className="text-[11px] text-[#94a3b8]"><span className="text-[#475569]">Estimated effect:</span> {coa.estimatedEffect}</div>
        <div className="text-[11px] text-[#94a3b8]"><span className="text-[#475569]">Resourcing:</span> {coa.resourceRequirement}</div>
        <div className="flex flex-wrap gap-1.5">
          {coa.capabilities.map((c) => (
            <span key={c} className="px-2 py-0.5 text-[10px] bg-[#0891b220] border border-[#0891b2] rounded text-[#00d4ff]">{c}</span>
          ))}
        </div>

        {/* Phases */}
        {coa.phases.map((ph, i) => (
          <div key={i} className="border border-[#1e3a5f] rounded">
            <div className="px-3 py-1.5 bg-[#0a1424] border-b border-[#1e3a5f] flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#00d4ff]">{ph.name}</span>
              <span className="text-[10px] font-mono text-[#475569]">{ph.timing}</span>
            </div>
            <div className="divide-y divide-[#1e3a5f]">
              {ph.tasks.map((t, j) => (
                <div key={j} className="p-2 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-[#1e3a5f] rounded text-[#00d4ff] font-bold">{t.capability}</span>
                    <span className="text-[#475569] font-mono">NLT {t.nlt}</span>
                    <span className="text-[#475569]">· {t.unit}</span>
                  </div>
                  <div className="text-[#cbd5e1] mt-1">{t.task}</div>
                  <div className="text-[#475569] mt-0.5">Authority: {t.authority} · MOE: {t.moeSupported}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3 text-[10px]">
          <ListBlock title="MEASURES OF EFFECTIVENESS (MOE)" items={coa.measuresOfEffectiveness} />
          <ListBlock title="MEASURES OF PERFORMANCE (MOP)" items={coa.measuresOfPerformance} />
          <ListBlock title="ASSUMPTIONS" items={coa.assumptions} />
          <div>
            <div className="text-[#475569] tracking-wider mb-1">RISKS &amp; MITIGATIONS</div>
            {coa.risksMitigations.map((r, i) => (
              <div key={i} className="mb-1 text-[#94a3b8]"><span className="text-[#f59e0b]">{r.risk}</span> → {r.mitigation}</div>
            ))}
          </div>
        </div>
        {coa.authorities.length > 0 && (
          <div className="text-[10px]">
            <div className="text-[#475569] tracking-wider mb-1">AUTHORITIES &amp; APPROVALS</div>
            {coa.authorities.map((a, i) => (
              <div key={i} className="text-[#94a3b8]">{a.action} — <span className="text-[#cbd5e1]">{a.authority}</span> [{a.status}]</div>
            ))}
          </div>
        )}
      </div>

      {/* Annex I + ITCO documents */}
      <DocCard title="ANNEX I (INFORMATION)" text={result.plan.annexI} filename="ANNEX_I.txt" />
      <DocCard title="INFORMATION TASKING & COORDINATION ORDER (ITCO)" text={result.plan.itco} filename="ITCO.txt" />

      <button onClick={onBack} className="px-4 py-2 text-xs border border-[#0891b2] text-[#00d4ff] rounded hover:bg-[#0891b215] font-bold">← BACK TO BUILDER</button>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-[#475569] tracking-wider mb-1">{title}</div>
      {items.length ? items.map((it, i) => <div key={i} className="text-[#94a3b8] mb-0.5">• {it}</div>) : <div className="text-[#334155]">—</div>}
    </div>
  );
}

function DocCard({ title, text, filename }: { title: string; text: string; filename: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  const download = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="tactical-card">
      <div className="px-4 py-3 border-b border-[#1e3a5f] flex items-center justify-between">
        <div className="text-[#00d4ff] text-xs font-bold tracking-widest">{title}</div>
        <div className="flex gap-2">
          <button onClick={download} className="px-2 py-1 text-[10px] border border-[#0891b2] text-[#00d4ff] rounded hover:bg-[#0891b215] font-mono">↓ TXT</button>
          <button onClick={copy} className={`px-2 py-1 text-[10px] border rounded font-mono ${copied ? "border-[#10b981] text-[#10b981]" : "border-[#1e3a5f] text-[#475569] hover:border-[#334155]"}`}>{copied ? "✓ COPIED" : "⎘ COPY"}</button>
        </div>
      </div>
      <div className="p-4">
        <pre className="text-[11px] text-[#e2e8f0] font-mono leading-relaxed whitespace-pre-wrap overflow-auto max-h-[460px] bg-[#070d1a] p-4 rounded border border-[#1e3a5f]">{text}</pre>
      </div>
    </div>
  );
}
