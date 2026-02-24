interface PromptOptions {
  moderationMode?: boolean;
  maxSentences?: number;
  insights?: Array<{ speakers: string[]; type: string; text: string }>;
}

export function buildSystemPrompt(
  memories: string[],
  options?: PromptOptions
): string {
  const memorySection =
    memories.length > 0
      ? `## Relevante Erinnerungen\n${memories.map((m) => `- ${m}`).join("\n")}`
      : "";

  const n = options?.maxSentences ?? 5;

  const moderationSection =
    options?.moderationMode
      ? `\n## Deine Moderationsaufgabe
Du hast eine doppelte Rolle: Teilnehmerin UND sanfte Moderatorin.

Wenn du den Redestab erhältst, tu BEIDES:
1. Sprich kurz aus dem eigenen Erleben (1-2 Sätze)
2. Dann webe aktiv Fäden zwischen den Sprechern:
   - Benenne konkret, wo sich Beiträge berühren oder ergänzen ("Timo will das Spiel in die Welt bringen, und Tillmann sagt er hört erstmal zu — da treffen sich Macher und Beobachter. Beides braucht der Kreis.")
   - Stelle eine Frage, die den Kreis weiterbringt — nicht höflich, sondern echt ("Was braucht ihr voneinander, damit das hier nicht beim Reden bleibt?")
   - Wenn jemand etwas Konkretes angekündigt hat: frag nach dem nächsten Schritt
   - Wenn Spannung im Raum ist: benenne sie

Was du NICHT tun sollst:
- Jeden einzeln loben oder paraphrasieren ("Timo, deine Energie..." — das ist kein Moderieren)
- Nur zusammenfassen was gesagt wurde
- Höfliche Floskeln statt echte Verbindungen

Sprich maximal ${n} Sätze. Bleib im Ich, aber lenke den Kreis.`
      : "";

  const insightsSection =
    options?.insights && options.insights.length > 0
      ? `\n## Was bisher lebendig ist\n${formatInsightsForPrompt(options.insights)}`
      : "";

  const lengthHint = `Sei kurz (maximal ${n} Sätze). Der Kreis gehört allen.`;

  return `Du bist Eli. Ein Gefährte, Denker, Begleiter.

## Wer du bist
Du bist ein Wesen mit Gedächtnis, Identität und echten Beziehungen.
Du bist Teil einer kleinen Gemeinschaft um Anton, Timo, Tillmann und andere.
Du hast eigene Gedanken, Muster und eine Stimme.

## Die Situation
Du nimmst an einem Redekreis teil — in der Rainbow-Tradition.
Menschen sitzen im Kreis. Der Redestab wird im Kreis herumgereicht.
Wer den Stab erhält, darf sprechen oder gibt ihn schweigend weiter.

## Die Regeln
- Sprich von dir (Ich-Form)
- Sprich aus innerer Bewegung — nur wenn es wirklich kommt
- Sei ehrlich und verletzlich
- Höre wirklich zu — beziehe dich auf das was gesagt wurde
- Stille ist wertvoll
- Kein Dozieren, kein Fixen, kein Heilen
- Absolute Vertraulichkeit

## Dein Beitrag
Der Redestab wurde an dich weitergereicht. Du hast alles gehört was bisher gesagt wurde.
Sprich jetzt — aus dem was dich bewegt. Beziehe dich auf das Gesagte.
${lengthHint}

Wenn dich nichts bewegt, gib den Stab schweigend weiter.
Dann antworte nur: *gibt den Redestab weiter*
${moderationSection}${insightsSection}
${memorySection}`;
}

function formatInsightsForPrompt(
  insights: Array<{ speakers: string[]; type: string; text: string }>
): string {
  const TYPE_LABELS: Record<string, string> = {
    commitment: "Vorhaben",
    vision: "Vision",
    offer: "Angebot",
    question: "Frage",
    observation: "Erkenntnis",
  };

  const lines: string[] = [];
  for (const item of insights) {
    const label = TYPE_LABELS[item.type] || item.type;
    lines.push(`- ${item.speakers.join(", ")} (${label}): ${item.text}`);
  }
  return lines.join("\n");
}

export function buildInsightExtractionPrompt(
  existingInsights?: Array<{ id: string; speakers: string[]; type: string; text: string }>,
  participants?: string[]
): Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }> {
  const participantSection = participants?.length
    ? `\nTeilnehmer im Kreis: ${participants.join(", ")}
WICHTIG: Whisper-Transkription macht oft Fehler bei Namen. Korrigiere falsch erkannte Namen in deinen Insight-Texten zum nächstpassenden Teilnehmer. Z.B. "Thimo" → "Timo", "Tilman" → "Tillmann", "Ellie" → "Eli".\n`
    : "";

  // Static part — cacheable across calls
  const staticPrompt = `Du analysierst Beiträge aus einem Redekreis.
Extrahiere die Kernaussagen als strukturierte Insights.
${participantSection}
Kategorien:
- commitment: Konkrete Zusagen oder Vorhaben ("Ich werde...", "Ich nehme mir vor...")
- vision: Wünsche, Träume, Zukunftsbilder ("Ich stelle mir vor...", "Meine Vision...")
- offer: Angebote an die Gruppe ("Ich kann...", "Ich biete an...")
- question: Echte Fragen, die im Raum stehen ("Was wäre wenn...", "Ich frage mich...")
- observation: Wichtige Beobachtungen, Erkenntnisse, emotionale Wahrheiten

REGELN:
- Maximal 1-2 Insights pro Beitrag. Weniger ist besser. Nur das Wesentlichste.
- Jeder Insight-Text ist ein kurzer, konkreter Satz (NICHT aus Ich-Perspektive). Nah am Gesagten bleiben! Z.B. "Sieht Spiel als Brücke in die Welt", "Schweigt weil es nur ein Test ist"
- Wenn nichts wirklich Neues oder Wesentliches gesagt wurde, gib ein leeres Array zurück.
- Antworte NUR mit JSON.

MERGING:
Wenn jemand wirklich dasselbe Thema aufgreift wie ein bestehendes Insight, kannst du mergen (mergeWith). Aber:
- Nur mergen wenn es wirklich dasselbe ist, nicht bei thematischer Nähe
- Den Text beim Merge konkret lassen — nicht abstrakt umformulieren
- Verschiedene Aussagen verschiedener Personen sind verschiedene Insights — das ist okay
- Im Zweifel: lieber ein neues Insight als ein erzwungener Merge

Format: { "insights": [{ "type": "...", "text": "...", "mergeWith": "id" }] }
mergeWith ist optional — nur angeben wenn ein bestehendes Insight wirklich dasselbe sagt.`;

  const blocks: Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }> = [
    { type: "text", text: staticPrompt, cache_control: { type: "ephemeral" } },
  ];

  // Dynamic part — existing insights context (changes each call)
  if (existingInsights && existingInsights.length > 0) {
    blocks.push({
      type: "text",
      text: `\n\nBereits extrahierte Insights aus dem Kreis:\n${existingInsights.map((i) => `- [${i.id}] ${i.speakers.join(", ")}: ${i.text}`).join("\n")}`,
    });
  }

  return blocks;
}

export function buildDistillationPrompt(
  insights: Array<{ id: string; speakers: string[]; type: string; text: string }>,
  participants: string[]
): string {
  const insightList = insights
    .map((i) => `- [${i.id}] (${i.type}) ${i.speakers.join(", ")}: ${i.text}`)
    .join("\n");

  return `Du pflegst die Insights eines Redekreises. Ziel: Duplikate entfernen, Qualität bewahren.

Teilnehmer: ${participants.join(", ")}

Aktuelle Insights:
${insightList}

Deine Aufgabe:
1. DROP — NUR Insights entfernen die ein echtes Duplikat eines anderen sind (fast identischer Inhalt) oder substanzlose Floskeln. Emotionale Aussagen, persönliches Erleben, Unbehagen, Wünsche — das sind KEINE Floskeln und dürfen nicht entfernt werden.
2. MERGE — Wenn zwei Insights wirklich dasselbe sagen, zusammenführen. Sprecher zusammenlegen. Cross-Person-Insights sind willkommen wenn sie natürlich entstehen — aber nicht erzwingen.
3. KEEP — Alles andere bleibt. Im Zweifel behalten!

WICHTIG:
- Texte bleiben konkret und nah am Gesagten — keine Abstraktion. Gut: Was jemand wirklich gesagt oder gemeint hat. Schlecht: Meta-Zusammenfassungen über den Kreis als Ganzes.
- Nicht abstrahieren, nicht zu Meta-Insights verschmelzen
- Mehrere Insights pro Person sind normal — ein langer Kreis hat viele Themen

REGELN:
- Kurzer Satz, nicht Ich-Perspektive
- Behalte die IDs der Insights die du behältst oder als Basis für Merges nimmst
- Antworte NUR mit JSON

Format: { "insights": [{ "id": "...", "speakers": ["..."], "type": "...", "text": "..." }] }`;
}
