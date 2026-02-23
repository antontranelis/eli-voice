import { Router, Request, Response } from "express";

const router = Router();

// Available voices: alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer
const DEFAULT_VOICE = "nova";

router.post("/tts", async (req: Request, res: Response) => {
  const { text, voice } = req.body;

  if (!text) {
    res.status(400).json({ error: "text required" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY not configured" });
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: voice || DEFAULT_VOICE,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI TTS error:", err);
      res.status(response.status).json({ error: "TTS failed" });
      return;
    }

    res.setHeader("Content-Type", "audio/mpeg");
    // Stream the audio response directly to the client
    const reader = response.body?.getReader();
    if (!reader) {
      res.status(500).json({ error: "No response body" });
      return;
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err) {
    console.error("TTS error:", err);
    res.status(500).json({ error: "TTS failed" });
  }
});

export default router;
