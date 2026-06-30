import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { documents, frameTransitions, frames } from "../db/schema.js";

export interface MotionPattern {
  tag: string;
  count: number;
  examples: Array<{
    documentId: string;
    documentTitle: string;
    description: string;
    frameFromUrl: string;
    frameToUrl: string;
  }>;
}

/**
 * Groups a user's frame_transitions by motion tag and picks up to 3
 * representative examples per tag — powers the Motion Insights Gallery.
 * Computed on read rather than via a separate materialized job for v1,
 * since per-user transition counts are small; revisit if this gets slow.
 */
export async function aggregateMotionPatterns(userId: string): Promise<MotionPattern[]> {
  const userDocs = await db.query.documents.findMany({
    where: eq(documents.userId, userId),
  });
  const docIds = new Set(userDocs.map((d) => d.id));
  const docTitleById = new Map(userDocs.map((d) => [d.id, d.title]));

  const allTransitions = await db.query.frameTransitions.findMany();
  const relevant = allTransitions.filter((t) => docIds.has(t.documentId));

  const allFrames = await db.query.frames.findMany();
  const frameUrlById = new Map(allFrames.map((f) => [f.id, f.storageUrl]));

  const byTag = new Map<string, MotionPattern>();
  for (const t of relevant) {
    for (const tag of t.motionTags) {
      if (!byTag.has(tag)) byTag.set(tag, { tag, count: 0, examples: [] });
      const entry = byTag.get(tag)!;
      entry.count += 1;
      if (entry.examples.length < 3) {
        entry.examples.push({
          documentId: t.documentId,
          documentTitle: docTitleById.get(t.documentId) || "Untitled",
          description: t.description,
          frameFromUrl: frameUrlById.get(t.frameFromId) || "",
          frameToUrl: frameUrlById.get(t.frameToId) || "",
        });
      }
    }
  }

  return [...byTag.values()].sort((a, b) => b.count - a.count);
}
