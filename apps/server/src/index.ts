import dotenv from "dotenv";
import { resolve } from "path";

// Load .env from project root (not from apps/server/)
dotenv.config({ path: resolve(import.meta.dirname, "../../../.env") });
import express from "express";
import cors from "cors";
import chatRouter from "./routes/chat.js";
import insightsRouter from "./routes/insights.js";
import ttsRouter from "./routes/tts.js";

const app = express();
const port = parseInt(process.env.PORT || "3001");

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api", chatRouter);
app.use("/api", insightsRouter);
app.use("/api", ttsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", name: "eli-voice-server" });
});

app.listen(port, () => {
  console.log(`Eli Voice Server auf Port ${port}`);
});
