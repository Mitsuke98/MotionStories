import { Router } from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import os from "node:os";
import path from "node:path";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";
import { getActiveKeyForProvider } from "../lib/keyStore.js";
import { downloadFromUrl, saveUploadedFile } from "../lib/download.js";
import { extractFrames } from "../lib/frames.js";
import { uploadFrame } from "../lib/storage.js";
import { describeFramePair } from "../lib/describe.js";
import { classifyContentType } from "../lib/classify.js";
import { jobQueue } from "../lib/jobQueue.js";
import { db } from "../db/client.js";
import { documents, frames, frameTransitions } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const jobsRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

function humanizeError(raw: string): string {
  if (raw.includes("credit balance is too low") || raw.includes("billing"))
    return "Your AI provider account has no credits. Please top up your balance at the provider's billing page, or switch to a different provider in Settings.";
  if (raw.includes("401") || raw.includes("authentication") || raw.includes("invalid x-api-key") || raw.includes("Premature close"))
    return "AI provider authentication failed. Check that your API key in Settings is correct and has not expired.";
  if (raw.includes("ENOENT") && raw.includes("yt-dlp"))
    return "yt-dlp is not installed. Ask your administrator to run: pip install yt-dlp";
  if (raw.includes("not extract enough frames"))
    return "Could not extract frames from this video — it may be too short, corrupted, or a format we don't support. Try uploading a different file.";
  if (raw.includes("Failed to download"))
    return "Could not download the video from that URL. The link may be private, geo-restricted, or the site may not be supported.";
  return raw;
}

jobsRouter.post(
  "/jobs",
  requireAuth,
  upload.single("file"),
  async (req: AuthedRequest, res) => {
    const { url, provider, title, model } = req.body ?? {};
    const userId = req.userId!;

    if (!provider) {
      res.status(400).json({ error: "provider is required (claude/openai/gemini)" });
      return;
    }
    if (!url && !req.file) {
      res.status(400).json({ error: "Provide either a video url or an uploaded file" });
      return;
    }

    const apiKey = await getActiveKeyForProvider(userId, provider);
    if (!apiKey) {
      res.status(400).json({
        error: `No saved API key for provider "${provider}". Add one in Settings first.`,
      });
      return;
    }

    const [doc] = await db
      .insert(documents)
      .values({
        userId,
        title: title || (url ? url : req.file!.originalname) || "Untitled video",
        sourceType: url ? "url" : "upload",
        sourceUrl: url || null,
        status: "processing",
      })
      .returning();

    // Process async; client polls GET /documents/:id for status.
    jobQueue.add(() =>
      processDocument({
        documentId: doc.id,
        provider,
        apiKey,
        model,
        url,
        fileBuffer: req.file?.buffer,
        fileName: req.file?.originalname,
      }).catch(async (err) => {
        console.error("Job failed", doc.id, err);
        await db
          .update(documents)
          .set({ status: "failed", errorMessage: humanizeError(String(err?.message || err)) })
          .where(eq(documents.id, doc.id));
      })
    );

    res.status(202).json({ documentId: doc.id, status: "processing" });
  }
);

async function processDocument(opts: {
  documentId: string;
  provider: string;
  apiKey: string;
  model?: string;
  url?: string;
  fileBuffer?: Buffer;
  fileName?: string;
}) {
  const workDir = path.join(os.tmpdir(), "motion-story", nanoid());

  const videoPath = opts.url
    ? await downloadFromUrl(opts.url, workDir)
    : await saveUploadedFile(opts.fileBuffer!, workDir, opts.fileName || "upload.mp4");

  const extracted = await extractFrames(videoPath, path.join(workDir, "frames"));
  if (extracted.length < 2) {
    throw new Error("Could not extract enough frames from this video (need at least 2)");
  }

  const frameRows = [];
  for (const f of extracted) {
    const key = `${opts.documentId}/frame_${String(f.seqIndex).padStart(2, "0")}.png`;
    const storageUrl = await uploadFrame(f.filePath, key);
    const [row] = await db
      .insert(frames)
      .values({
        documentId: opts.documentId,
        seqIndex: f.seqIndex,
        timestampSec: f.timestampSec,
        storageUrl,
      })
      .returning();
    frameRows.push(row);
  }

  const descriptions: string[] = [];
  for (let i = 0; i < extracted.length - 1; i++) {
    const result = await describeFramePair({
      provider: opts.provider,
      apiKey: opts.apiKey,
      model: opts.model,
      imagePathA: extracted[i].filePath,
      imagePathB: extracted[i + 1].filePath,
    });
    descriptions.push(result.description);
    await db.insert(frameTransitions).values({
      documentId: opts.documentId,
      frameFromId: frameRows[i].id,
      frameToId: frameRows[i + 1].id,
      seqIndex: i + 1,
      description: result.description,
      motionTags: result.motionTags,
      aiProviderUsed: opts.provider,
    });
  }

  const contentType = classifyContentType(descriptions);

  await db
    .update(documents)
    .set({ status: "done", contentType, updatedAt: new Date() })
    .where(eq(documents.id, opts.documentId));
}
