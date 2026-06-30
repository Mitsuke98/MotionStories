import "dotenv/config";
import YTDlpWrap from "yt-dlp-wrap";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { authRouter } from "./routes/auth.js";
import { settingsRouter } from "./routes/settings.js";
import { jobsRouter } from "./routes/jobs.js";
import { documentsRouter } from "./routes/documents.js";
import { galleryRouter } from "./routes/gallery.js";
import { recreateRouter } from "./routes/recreate.js";

// Auto-download yt-dlp binary if not present
if (!process.env.YTDLP_PATH) {
  try {
    await (YTDlpWrap as any).default.downloadFromGithub();
    console.log("yt-dlp downloaded.");
  } catch (e) {
    console.warn("yt-dlp auto-download failed:", e);
  }
}

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use("/frames", express.static(path.resolve("public", "frames")));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/", settingsRouter);
app.use("/", jobsRouter);
app.use("/", documentsRouter);
app.use("/", galleryRouter);
app.use("/", recreateRouter);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Motion Story server listening on http://localhost:${port}`);
});
