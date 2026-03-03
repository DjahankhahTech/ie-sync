/**
 * Rule-based keyword sentiment taxonomy — NO black-box AI.
 * Categories: HOSTILE(-1.0), PROVOCATIVE(-0.7), DEFENSIVE(-0.3), NEUTRAL(0), CONCILIATORY(+0.5)
 */

export interface SentimentKeyword {
  keyword: string;
  weight: number;
  category: "HOSTILE" | "PROVOCATIVE" | "DEFENSIVE" | "NEUTRAL" | "CONCILIATORY";
}

export const SENTIMENT_KEYWORDS: SentimentKeyword[] = [
  // HOSTILE (-1.0)
  { keyword: "aggression", weight: -1.0, category: "HOSTILE" },
  { keyword: "imperialism", weight: -1.0, category: "HOSTILE" },
  { keyword: "provocation", weight: -1.0, category: "HOSTILE" },
  { keyword: "hegemony", weight: -1.0, category: "HOSTILE" },
  { keyword: "destabilize", weight: -1.0, category: "HOSTILE" },
  { keyword: "threat to peace", weight: -1.0, category: "HOSTILE" },
  { keyword: "military expansion", weight: -0.9, category: "HOSTILE" },
  { keyword: "containment", weight: -0.9, category: "HOSTILE" },
  { keyword: "encirclement", weight: -0.9, category: "HOSTILE" },
  { keyword: "warmongering", weight: -1.0, category: "HOSTILE" },

  // PROVOCATIVE (-0.7)
  { keyword: "condemn", weight: -0.7, category: "PROVOCATIVE" },
  { keyword: "violation", weight: -0.7, category: "PROVOCATIVE" },
  { keyword: "unacceptable", weight: -0.7, category: "PROVOCATIVE" },
  { keyword: "escalation", weight: -0.7, category: "PROVOCATIVE" },
  { keyword: "sanctions", weight: -0.6, category: "PROVOCATIVE" },
  { keyword: "retaliation", weight: -0.7, category: "PROVOCATIVE" },
  { keyword: "counter-measures", weight: -0.6, category: "PROVOCATIVE" },

  // DEFENSIVE (-0.3)
  { keyword: "sovereignty", weight: -0.3, category: "DEFENSIVE" },
  { keyword: "territorial integrity", weight: -0.3, category: "DEFENSIVE" },
  { keyword: "self-defense", weight: -0.3, category: "DEFENSIVE" },
  { keyword: "internal affairs", weight: -0.3, category: "DEFENSIVE" },
  { keyword: "legitimate rights", weight: -0.3, category: "DEFENSIVE" },

  // NEUTRAL (0)
  { keyword: "statement", weight: 0, category: "NEUTRAL" },
  { keyword: "reported", weight: 0, category: "NEUTRAL" },
  { keyword: "according to", weight: 0, category: "NEUTRAL" },
  { keyword: "official", weight: 0, category: "NEUTRAL" },

  // CONCILIATORY (+0.5)
  { keyword: "cooperation", weight: 0.5, category: "CONCILIATORY" },
  { keyword: "dialogue", weight: 0.5, category: "CONCILIATORY" },
  { keyword: "diplomatic", weight: 0.4, category: "CONCILIATORY" },
  { keyword: "mutual benefit", weight: 0.5, category: "CONCILIATORY" },
  { keyword: "peaceful resolution", weight: 0.5, category: "CONCILIATORY" },
  { keyword: "de-escalation", weight: 0.5, category: "CONCILIATORY" },
];

export type SentimentCategory = "HOSTILE" | "PROVOCATIVE" | "DEFENSIVE" | "NEUTRAL" | "CONCILIATORY";

export function classifySentiment(score: number): SentimentCategory {
  if (score <= -0.7) return "HOSTILE";
  if (score <= -0.3) return "PROVOCATIVE";
  if (score <= -0.1) return "DEFENSIVE";
  if (score <= 0.2) return "NEUTRAL";
  return "CONCILIATORY";
}

export function scoreSentiment(text: string): { score: number; matchedKeywords: string[] } {
  const lower = text.toLowerCase();
  const matches: string[] = [];
  let totalWeight = 0;
  let count = 0;

  for (const kw of SENTIMENT_KEYWORDS) {
    if (lower.includes(kw.keyword)) {
      matches.push(kw.keyword);
      totalWeight += kw.weight;
      count++;
    }
  }

  const score = count > 0 ? totalWeight / count : 0;
  return { score: Math.max(-1, Math.min(1, score)), matchedKeywords: matches };
}
