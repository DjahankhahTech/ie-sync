"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { ABMDState } from "@/lib/mock-data";

interface ABMDTimelineProps {
  timeline: ABMDState["timeline"];
}

export function ABMDTimeline({ timeline }: ABMDTimelineProps) {
  return (
    <div className="border border-[#1e3a5f] rounded p-3 bg-[#070d1a]">
      <div className="text-[9px] tracking-[0.12em] text-[#94a3b8] font-bold mb-3">
        LAUNCH / INTERCEPT TIMELINE (7 DAY)
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={timeline} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#94a3b8", fontSize: 9 }}
              tickFormatter={(v: string) => v.slice(5)}
              stroke="#1e3a5f"
            />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} stroke="#1e3a5f" />
            <Tooltip
              contentStyle={{ background: "#0a1628", border: "1px solid #1e3a5f", fontSize: 10 }}
              labelStyle={{ color: "#94a3b8" }}
            />
            <Legend wrapperStyle={{ fontSize: 9, color: "#94a3b8" }} />
            <Bar dataKey="launches" fill="#ef4444" name="Launches" radius={[2, 2, 0, 0]} />
            <Bar dataKey="intercepts" fill="#10b981" name="Intercepts" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
