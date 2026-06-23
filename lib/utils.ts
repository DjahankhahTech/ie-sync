import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(date: Date): string {
  return date.toISOString().replace("T", " ").substring(0, 19) + "Z";
}

export function formatDTG(date: Date = new Date()): string {
  const d = date;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const mins = String(d.getUTCMinutes()).padStart(2, "0");
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const month = months[d.getUTCMonth()];
  const year = String(d.getUTCFullYear()).slice(2);
  return `${day}${hours}${mins}Z ${month} ${year}`;
}

export function threatColor(level: string): string {
  const map: Record<string, string> = {
    CRITICAL: "#ff2222",
    HIGH: "#ff6622",
    MEDIUM: "#ffaa22",
    LOW: "#22cc88",
    INFO: "#2288ff",
  };
  return map[level] ?? "#94a3b8";
}

export function confidenceColor(pct: number): string {
  if (pct >= 80) return "#10b981";
  if (pct >= 60) return "#f59e0b";
  return "#ef4444";
}
