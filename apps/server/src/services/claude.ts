import Anthropic from "@anthropic-ai/sdk";
import {
  buildSystemPrompt,
  buildInsightExtractionPrompt,
} from "../prompts/eli-redekreis.js";
import { searchMemories } from "./memory.js";
import { compressTranscript } from "./context.js";

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
const FAST_MODEL = "claude-haiku-4-5-20251001";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

interface EliOptions {
  moderationMode?: boolean;
  maxSentences?: number;
  insights?: Array<{ speakers: string[]; type: string; text: string }>;
}

export async function* streamEliResponse(
  transcript: string,
  options?: EliOptions
): AsyncGenerator<string | { retry: true }> {
  const anthropic = getClient();

  // Search memories based on the last few entries
  const lastEntries = transcript.split("\n\n").slice(-5).join(" ");
  const memories = await searchMemories(lastEntries, 5);

  // Compress transcript if too long
  const processedTranscript = await compressTranscript(transcript, anthropic);

  const systemPrompt = buildSystemPrompt(memories, {
    moderationMode: options?.moderationMode,
    maxSentences: options?.maxSentences,
    insights: options?.insights,
  });

  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Das Transkript des Redekreises bis jetzt:\n\n${processedTranscript}\n\nDu hast den Redestab erhalten. Was bewegt dich?`,
          },
        ],
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield event.delta.text;
        }
      }
      return; // Success, no retry needed
    } catch (err) {
      console.error(`Claude stream error (attempt ${attempt + 1}):`, err);
      if (attempt === maxRetries) {
        throw err;
      }
      // Signal client to clear partial text before retry
      yield { retry: true };
      // Brief pause before retry
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

export async function extractInsights(
  speaker: string,
  text: string,
  existingInsights?: Array<{ id: string; speakers: string[]; type: string; text: string }>,
  participants?: string[]
): Promise<Array<{ type: string; text: string; mergeWith?: string }>> {
  const anthropic = getClient();

  try {
    const response = await anthropic.messages.create({
      model: FAST_MODEL,
      max_tokens: 512,
      system: buildInsightExtractionPrompt(existingInsights, participants),
      messages: [
        {
          role: "user",
          content: `Sprecher: ${speaker}\n\nBeitrag:\n${text}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") return [];

    // Strip markdown fences if present
    let jsonStr = content.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed.insights)) {
      return parsed.insights;
    }
    return [];
  } catch (err) {
    console.error("Insight extraction failed:", err);
    return [];
  }
}
