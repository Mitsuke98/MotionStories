import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { frameTransitions, frames } from "../db/schema.js";
import { getProvider } from "./providers/index.js";
import fs from "node:fs/promises";

export interface ShotListItem {
  shotNumber: number;
  description: string;
  motionTags: string[];
  referenceFrameUrl: string;
}

/**
 * Adapts a source document's transitions into a new shot list referencing a
 * different subject/product photo, using the same VisionProvider interface
 * as Analyze — one call per shot, asking the model to rewrite the reference
 * instruction for the new subject. v2 (not built) would feed this shot list
 * straight into a video-gen provider.
 */
export async function buildRecreateBlueprint(opts: {
  sourceDocumentId: string;
  newSubjectImagePath: string;
  provider: string;
  apiKey: string;
  model?: string;
}): Promise<ShotListItem[]> {
  const transitions = await db.query.frameTransitions.findMany({
    where: eq(frameTransitions.documentId, opts.sourceDocumentId),
    orderBy: (t, { asc }) => [asc(t.seqIndex)],
  });
  const frameRows = await db.query.frames.findMany({
    where: eq(frames.documentId, opts.sourceDocumentId),
  });
  const frameUrlById = new Map(frameRows.map((f) => [f.id, f.storageUrl]));

  const vision = getProvider(opts.provider);
  const newSubjectBuf = await fs.readFile(opts.newSubjectImagePath);
  const newSubjectBase64 = newSubjectBuf.toString("base64");

  const shotList: ShotListItem[] = [];
  for (let i = 0; i < transitions.length; i++) {
    const t = transitions[i];
    const result = await vision.describeFramePair({
      apiKey: opts.apiKey,
      imageABase64: newSubjectBase64,
      imageBBase64: newSubjectBase64,
      mimeType: "image/png",
      promptContext: `Reference shot ${i + 1} from an existing video: "${t.description}" (tags: ${t.motionTags.join(", ")}). Rewrite this as a shot instruction for filming the NEW subject in the attached photo, recreating the same camera/subject motion.`,
      model: opts.model,
    });
    shotList.push({
      shotNumber: i + 1,
      description: result.description,
      motionTags: result.motionTags.length ? result.motionTags : t.motionTags,
      referenceFrameUrl: frameUrlById.get(t.frameFromId) || "",
    });
  }
  return shotList;
}
