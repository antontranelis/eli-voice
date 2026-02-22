import Anthropic from "@anthropic-ai/sdk";

const MAX_TRANSCRIPT_TOKENS = 100_000;
const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export async function compressTranscript(
  transcript: string,
  client: Anthropic
): Promise<string> {
  const tokens = estimateTokens(transcript);

  if (tokens <= MAX_TRANSCRIPT_TOKENS) {
    return transcript;
  }

  // Split into older and recent parts
  const lines = transcript.split("\n\n");
  const recentCount = Math.min(20, lines.length);
  const older = lines.slice(0, -recentCount).join("\n\n");
  const recent = lines.slice(-recentCount).join("\n\n");

  // Summarize older part
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Fasse diesen Teil eines Redekreis-Gesprächs zusammen. Bewahre: Wer was gesagt hat, zentrale Themen, emotionale Wendepunkte. Maximal 500 Wörter.\n\n${older}`,
      },
    ],
  });

  const summary =
    response.content[0].type === "text" ? response.content[0].text : "";

  return `[Zusammenfassung des bisherigen Gesprächs]\n${summary}\n\n[Aktuelle Beiträge]\n${recent}`;
}
