"use client";

import { useIEStore } from "@/store/ie-store";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { IEOverlay } from "@/components/cop/IEOverlay";
import { RunningEstimateModule } from "@/components/running-estimate/RunningEstimate";
import { COAEngine } from "@/components/coa/COAEngine";
import { SIGMANMonitor } from "@/components/sigman/SIGMANMonitor";
import { AnnexGenerator } from "@/components/annex/AnnexGenerator";
import { SensorFusion } from "@/components/sensor-fusion/SensorFusion";
import { ConcealRevealDashboard } from "@/components/conceal-reveal/ConcealRevealDashboard";
import { SignatureMgmtDashboard } from "@/components/signature-mgmt/SignatureMgmtDashboard";
import { AdversaryPerceptionsDashboard } from "@/components/adversary-perceptions/AdversaryPerceptionsDashboard";
import { GrayZoneDashboard } from "@/components/gray-zone/GrayZoneDashboard";
import { ABMDDashboard } from "@/components/abmd/ABMDDashboard";

const moduleMap: Record<string, React.ComponentType> = {
  cop: IEOverlay,
  "running-estimate": RunningEstimateModule,
  "sensor-fusion": SensorFusion,
  coa: COAEngine,
  sigman: SIGMANMonitor,
  annex: AnnexGenerator,
  "conceal-reveal": ConcealRevealDashboard,
  "signature-mgmt": SignatureMgmtDashboard,
  "adversary-perceptions": AdversaryPerceptionsDashboard,
  "gray-zone": GrayZoneDashboard,
  abmd: ABMDDashboard,
};

export function AppShell() {
  const { activeModule } = useIEStore();
  const ActiveComponent = moduleMap[activeModule] ?? IEOverlay;

  return (
    <div className="flex flex-col h-screen overflow-hidden tactical-bg">
      {/* Scanning line effect */}
      <div className="scan-line" />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-hidden relative z-0">
            <ActiveComponent />
          </main>
        </div>
      </div>
    </div>
  );
}
