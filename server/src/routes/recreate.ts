import { Router } from "express";
import multer from "multer";
import path from "node:path";
import os from "node:os";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";
import { getActiveKeyForProvider } from "../lib/keyStore.js";
import { saveUploadedFile } from "../lib/download.js";
import { uploadFrame } from "../lib/storage.js";
import { buildRecreateBlueprint } from "../lib/recreateBlueprint.js";
import { jobQueue } from "../lib/jobQueue.js";
import { db } from "../db/client.js";
import { recreateBlueprints, documents } from "../db/schema.js";

export const recreateRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

recreateRouter.post(
  "/recreate",
  requireAuth,
  upload.single("subjectImage"),
  async (req: AuthedRequest, res) => {
    const { sourceDocumentId, provider, model } = req.body ?? {};
    const userId = req.userId!;

    if (!sourceDocumentId || !provider || !req.file) {
      res.status(400).json({
        error: "sourceDocumentId, provider, and subjectImage file are required",
      });
      return;
    }

    const sourceDoc = await db.query.documents.findFirst({
      where: and(eq(documents.id, sourceDocumentId), eq(documents.userId, userId)),
    });
    if (!sourceDoc) {
      res.status(404).json({ error: "Source document not found" });
      return;
    }

    const apiKey = await getActiveKeyForProvider(userId, provider);
    if (!apiKey) {
      res.status(400).json({ error: `No saved API key for provider "${provider}"` });
      return;
    }

    const workDir = path.join(os.tmpdir(), "motion-story-recreate", nanoid());
    const localImagePath = await saveUploadedFile(
      req.file.buffer,
      workDir,
      req.file.originalname
    );
    const subjectImageUrl = await uploadFrame(
      localImagePath,
      `recreate/${nanoid()}-${req.file.originalname}`
    );

    const [blueprint] = await db
      .insert(recreateBlueprints)
      .values({
        userId,
        sourceDocumentId,
        newSubjectImageUrl: subjectImageUrl,
        status: "processing",
      })
      .returning();

    jobQueue.add(async () => {
      try {
        const shotList = await buildRecreateBlueprint({
          sourceDocumentId,
          newSubjectImagePath: localImagePath,
          provider,
          apiKey,
          model,
        });
        await db
          .update(recreateBlueprints)
          .set({ shotList, status: "done" })
          .where(eq(recreateBlueprints.id, blueprint.id));
      } catch (err) {
        console.error("Recreate blueprint failed", blueprint.id, err);
        await db
          .update(recreateBlueprints)
          .set({ status: "failed" })
          .where(eq(recreateBlueprints.id, blueprint.id));
      }
    });

    res.status(202).json({ blueprintId: blueprint.id, status: "processing" });
  }
);

recreateRouter.get(
  "/recreate/:id",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const row = await db.query.recreateBlueprints.findFirst({
      where: and(
        eq(recreateBlueprints.id, req.params.id),
        eq(recreateBlueprints.userId, req.userId!)
      ),
    });
    if (!row) {
      res.status(404).json({ error: "Blueprint not found" });
      return;
    }
    res.json(row);
  }
);
