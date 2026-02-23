import { Router, Request, Response } from "express";
import { saveMemory } from "../services/memory.js";

const router = Router();

router.post("/circle/save", async (req: Request, res: Response) => {
  const { insights, participants, date } = req.body;

  if (!insights?.length) {
    res.json({ saved: 0 });
    return;
  }

  const dateStr = date || new Date().toISOString().slice(0, 10);
  let saved = 0;

  for (const insight of insights) {
    const text = `Redekreis ${dateStr} — ${insight.speakers.join(", ")}: ${insight.text}`;
    const ok = await saveMemory(text, {
      date: dateStr,
      type: insight.type,
      speakers: insight.speakers.join(","),
      participants: (participants || []).join(","),
    });
    if (ok) saved++;
  }

  console.log(`[Circle] ${saved}/${insights.length} Insights als Erinnerungen gespeichert`);
  res.json({ saved });
});

export default router;
