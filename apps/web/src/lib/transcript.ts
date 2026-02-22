export interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: Date;
  isEli?: boolean;
}

export type InsightType = 'commitment' | 'vision' | 'offer' | 'question' | 'observation';

export interface Insight {
  speaker: string;
  type: InsightType;
  text: string;
  entryIndex: number;
  timestamp: Date;
}

export function formatTranscriptForEli(entries: TranscriptEntry[]): string {
  return entries
    .map((e) => `[${e.speaker}]: ${e.text}`)
    .join("\n\n");
}

export function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4);
}
