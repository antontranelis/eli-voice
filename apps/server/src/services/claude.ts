import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "../prompts/eli-redekreis.js";
import { searchMemories } from "./memory.js";
import { compressTranscript } from "./context.js";

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export async function* streamEliResponse(
  transcript: string
): AsyncGenerator<string | { retry: true }> {
  const anthropic = getClient();

  // Search memories based on the last few entries
  const lastEntries = transcript.split("\n\n").slice(-5).join(" ");
  const memories = await searchMemories(lastEntries, 5);

  // Compress transcript if too long
  const processedTranscript = await compressTranscript(transcript, anthropic);

  const systemPrompt = buildSystemPrompt(memories);

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
