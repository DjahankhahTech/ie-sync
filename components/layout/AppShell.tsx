"use client";

import { useEffect } from "react";
import { useIEStore } from "@/store/ie-store";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ClassificationBanner } from "./ClassificationBanner";
import { IEOverlay } from "@/components/cop/IEOverlay";
import { IEMapTab } from "@/components/cop/IEMapTab";
import { RunningEstimateModule } from "@/components/running-estimate/RunningEstimate";
import { IOPlanner } from "@/components/io-planner/IOPlanner";
import { SIGMANMonitor } from "@/components/sigman/SIGMANMonitor";
import { SensorFusion } from "@/components/sensor-fusion/SensorFusion";
import { STTab } from "@/components/st/STTab";
import { DoctrineLibrary } from "@/components/doctrine/DoctrineLibrary";
import { DoctrinalOverview } from "@/components/overview/DoctrinalOverview";

const moduleMap: Record<string, React.ComponentType> = {
  home: DoctrinalOverview,
  cop: IEOverlay,
  "ie-map": IEMapTab,
  "running-estimate": RunningEstimateModule,
  "sensor-fusion": SensorFusion,
  "io-planner": IOPlanner,
  sigman: SIGMANMonitor,
  "s-and-t": STTab,
  doctrine: DoctrineLibrary,
};

export function AppShell() {
  const { activeModule, activeGCC, prefetchAIProducts } = useIEStore();
  const ActiveComponent = moduleMap[activeModule] ?? DoctrinalOverview;

  // Warm the day's AI products (Running Estimate, INFSUM summary, SIGMAN) in the
  // background as soon as the app loads / AOR changes — they're posted 3x daily
  // (0600/1200/1800 ET) and server-cached, so this is a fast cache hit and tabs
  // open already-populated (no first-visit loading spinner).
  useEffect(() => {
    prefetchAIProducts(activeGCC);
  }, [activeGCC, prefetchAIProducts]);

  return (
    <div className="flex flex-col h-screen overflow-hidden tactical-bg">
      {/* Scanning line effect */}
      <div className="scan-line" />

      <ClassificationBanner />
      <Sidebar />
      <Header />
      <main className="flex-1 overflow-hidden">
        <ActiveComponent />
      </main>
    </div>
  );
}
