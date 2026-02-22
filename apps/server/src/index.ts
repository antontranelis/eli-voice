import "dotenv/config";
import express from "express";
import cors from "cors";
import chatRouter from "./routes/chat.js";

const app = express();
const port = parseInt(process.env.PORT || "3001");

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api", chatRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", name: "eli-voice-server" });
});

app.listen(port, () => {
  console.log(`Eli Voice Server auf Port ${port}`);
});
