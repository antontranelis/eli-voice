import { Router, Request, Response } from "express";
import { extractInsights } from "../services/claude.js";

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

export default router;
