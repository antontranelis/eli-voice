import { Router, Request, Response } from "express";
import { streamEliResponse } from "../services/claude.js";

const router = Router();

router.post("/eli", async (req: Request, res: Response) => {
  const { transcript, moderationMode, insights } = req.body;

  if (!transcript) {
    res.status(400).json({ error: "transcript required" });
    return;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    for await (const chunk of streamEliResponse(transcript, {
      moderationMode,
      insights,
    })) {
      if (typeof chunk === "string") {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      } else if (chunk.retry) {
        // Signal client to clear partial text before retry
        res.write(`data: ${JSON.stringify({ retry: true })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    console.error("Eli stream error:", err);
    res.write(
      `data: ${JSON.stringify({ error: "Eli konnte nicht antworten" })}\n\n`
    );
  } finally {
    res.end();
  }
});

export default router;
