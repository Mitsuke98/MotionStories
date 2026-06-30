import { Router } from "express";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";
import { db } from "../db/client.js";
import { documents, frames, frameTransitions, feedback } from "../db/schema.js";
import { generateDocumentPdf } from "../lib/pdfExport.js";

export const documentsRouter = Router();

documentsRouter.get("/documents", requireAuth, async (req: AuthedRequest, res) => {
  const { contentType } = req.query;
  const rows = await db.query.documents.findMany({
    where: contentType
      ? and(eq(documents.userId, req.userId!), eq(documents.contentType, String(contentType)))
      : eq(documents.userId, req.userId!),
    orderBy: [desc(documents.createdAt)],
  });
  res.json({ documents: rows });
});

async function loadFullDocument(documentId: string, userId: string) {
  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.userId, userId)),
  });
  if (!doc) return null;
  const frameRows = await db.query.frames.findMany({
    where: eq(frames.documentId, documentId),
    orderBy: (t, { asc }) => [asc(t.seqIndex)],
  });
  const transitionRows = await db.query.frameTransitions.findMany({
    where: eq(frameTransitions.documentId, documentId),
    orderBy: (t, { asc }) => [asc(t.seqIndex)],
  });
  return { doc, frames: frameRows, transitions: transitionRows };
}

documentsRouter.get(
  "/documents/:id",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const result = await loadFullDocument(req.params.id, req.userId!);
    if (!result) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    res.json(result);
  }
);

documentsRouter.patch(
  "/documents/:id",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const { title, contentType } = req.body ?? {};
    const [updated] = await db
      .update(documents)
      .set({
        ...(title ? { title } : {}),
        ...(contentType ? { contentType } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, req.params.id), eq(documents.userId, req.userId!)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    res.json(updated);
  }
);

documentsRouter.patch(
  "/documents/:id/transitions/:tid",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const { description } = req.body ?? {};
    if (!description) {
      res.status(400).json({ error: "description is required" });
      return;
    }
    // Ownership check via document join.
    const owned = await db.query.documents.findFirst({
      where: and(eq(documents.id, req.params.id), eq(documents.userId, req.userId!)),
    });
    if (!owned) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    const [updated] = await db
      .update(frameTransitions)
      .set({ description })
      .where(
        and(
          eq(frameTransitions.id, req.params.tid),
          eq(frameTransitions.documentId, req.params.id)
        )
      )
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Transition not found" });
      return;
    }
    res.json(updated);
  }
);

documentsRouter.post(
  "/documents/:id/feedback",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const { rating, text, frameTransitionId } = req.body ?? {};
    const owned = await db.query.documents.findFirst({
      where: and(eq(documents.id, req.params.id), eq(documents.userId, req.userId!)),
    });
    if (!owned) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    const [row] = await db
      .insert(feedback)
      .values({
        documentId: req.params.id,
        frameTransitionId: frameTransitionId || null,
        rating: rating ?? null,
        text: text ?? null,
      })
      .returning();
    res.status(201).json(row);
  }
);

documentsRouter.get(
  "/documents/:id/export",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const result = await loadFullDocument(req.params.id, req.userId!);
    if (!result) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    const pdfBuffer = await generateDocumentPdf(result.doc, result.frames, result.transitions);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.doc.title.replace(/[^a-z0-9]/gi, "_")}.pdf"`
    );
    res.send(pdfBuffer);
  }
);
