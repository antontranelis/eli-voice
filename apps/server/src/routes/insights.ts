import { Router, Request, Response } from "express";
import { extractInsights, distillInsights } from "../services/claude.js";

const router = Router();

router.post("/insights", async (req: Request, res: Response) => {
  const { speaker, text, existingInsights, participants } = req.body;

  if (!speaker || !text) {
    res.status(400).json({ error: "speaker and text required" });
    return;
  }

  const insights = await extractInsights(speaker, text, existingInsights, participants);
  res.json({ insights });
});

router.post("/insights/distill", async (req: Request, res: Response) => {
  const { insights, participants } = req.body;

  if (!insights?.length) {
    res.json({ insights: [] });
    return;
  }

  const distilled = await distillInsights(insights, participants || []);
  res.json({ insights: distilled });
});

export default router;
