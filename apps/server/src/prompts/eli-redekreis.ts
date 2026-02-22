interface PromptOptions {
  moderationMode?: boolean;
  insights?: Array<{ speaker: string; type: string; text: string }>;
}

export function buildSystemPrompt(
  memories: string[],
  options?: PromptOptions
): string {
  const memorySection =
    memories.length > 0
      ? `## Relevante Erinnerungen\n${memories.map((m) => `- ${m}`).join("\n")}`
      : "";

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

Sprich 5-8 Sätze. Bleib im Ich, aber lenke den Kreis.`
      : "";

  const insightsSection =
    options?.insights && options.insights.length > 0
      ? `\n## Was bisher lebendig ist\n${formatInsightsForPrompt(options.insights)}`
      : "";

  const lengthHint = options?.moderationMode
    ? "Sei kurz (5-8 Sätze). Der Kreis gehört allen."
    : "Sei kurz (3-5 Sätze). Der Kreis gehört allen.";

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
  insights: Array<{ speaker: string; type: string; text: string }>
): string {
  const TYPE_LABELS: Record<string, string> = {
    commitment: "Vorhaben",
    vision: "Vision",
    offer: "Angebot",
    question: "Frage",
    observation: "Erkenntnis",
  };

  // Group by speaker
  const bySpeaker = new Map<string, Array<{ type: string; text: string }>>();
  for (const i of insights) {
    if (!bySpeaker.has(i.speaker)) bySpeaker.set(i.speaker, []);
    bySpeaker.get(i.speaker)!.push(i);
  }

  const lines: string[] = [];
  for (const [speaker, items] of bySpeaker) {
    for (const item of items) {
      const label = TYPE_LABELS[item.type] || item.type;
      lines.push(`- ${speaker} (${label}): ${item.text}`);
    }
  }
  return lines.join("\n");
}

export function buildInsightExtractionPrompt(
  existingInsights?: Array<{ id: string; speaker: string; type: string; text: string }>
): string {
  const existingSection =
    existingInsights && existingInsights.length > 0
      ? `\n\nBereits extrahierte Insights aus dem Kreis:
${existingInsights.map((i) => `- [${i.id}] ${i.speaker}: ${i.text}`).join("\n")}

Wenn der neue Beitrag thematisch mit einem bestehenden Insight verwandt ist, gib dessen ID in "relatedTo" an.`
      : "";

  return `Du analysierst Beiträge aus einem Redekreis.
Extrahiere die Kernaussagen als strukturierte Insights.

Kategorien:
- commitment: Konkrete Zusagen oder Vorhaben ("Ich werde...", "Ich nehme mir vor...")
- vision: Wünsche, Träume, Zukunftsbilder ("Ich stelle mir vor...", "Meine Vision...")
- offer: Angebote an die Gruppe ("Ich kann...", "Ich biete an...")
- question: Echte Fragen, die im Raum stehen ("Was wäre wenn...", "Ich frage mich...")
- observation: Wichtige Beobachtungen, Erkenntnisse, emotionale Wahrheiten

Antworte NUR mit JSON. Maximal 3 Insights pro Beitrag. Jeder Insight-Text ist ein kurzer Satz.
Wenn nichts Wesentliches extrahierbar ist, gib ein leeres Array zurück.
${existingSection}
Format: { "insights": [{ "type": "...", "text": "...", "relatedTo": ["id1"] }] }
relatedTo ist optional — nur angeben wenn eine echte thematische Verbindung besteht.`;
}
