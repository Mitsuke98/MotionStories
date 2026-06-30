/**
 * Seeds fake frame transitions for a document that ran out of API credits,
 * so we can smoke-test Library / Gallery / PDF export / feedback flows.
 */
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema.js";
import { eq, asc } from "drizzle-orm";

const docId = process.argv[2];
if (!docId) { console.error("Usage: node seed-transitions.mjs <documentId>"); process.exit(1); }

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

const frameRows = await db.query.frames.findMany({
  where: eq(schema.frames.documentId, docId),
  orderBy: [asc(schema.frames.seqIndex)],
});
if (frameRows.length < 2) { console.error("Need ≥2 frames"); process.exit(1); }

const descriptions = [
  { d: "The screen fades up from black, revealing the faint outline of the GoPro camera's rounded silhouette lit only by a thin rim of light against a dark background.", tags: ["fade"] },
  { d: "The lighting brightens quickly and the camera is revealed in a front-on view, floating in darkness — you can clearly see the lens and the blue GoPro logo.", tags: ["zoom-in"] },
  { d: "The camera tilts and rotates slightly to a three-quarter angle, showing more of its side.", tags: ["rotate"] },
  { d: "The camera body breaks apart into an exploded-view diagram — the lens module, sensor, frame, and mounting base all separate and drift diagonally outward.", tags: ["exploded-view"] },
  { d: "The exploded parts drift further apart, spacing the components out more widely in mid-air.", tags: ["zoom-out", "exploded-view"] },
  { d: "The whole exploded assembly starts rotating as the pieces begin drifting back together, and the virtual camera starts zooming in toward the reassembling body.", tags: ["rotate", "zoom-in"] },
  { d: "A tight close-up on the back-side edge of the reassembled camera as it continues rotating upward.", tags: ["pan-right", "rotate"] },
  { d: "The view sweeps across the top of the camera, showing the record button and status indicator area.", tags: ["pan-left", "tilt-up"] },
  { d: "Close-up slides forward along the lens and front edge, with the ridged side grip visible at the edge of frame.", tags: ["dolly"] },
  { d: "The camera pulls back slightly to bring the front-right corner into view, showing both the lens and the GoPro logo together.", tags: ["pull-back"] },
  { d: "A top-down close-up lands on the status screen and the red record button — the camera is almost stationary for this beat.", tags: ["static", "tilt-down"] },
  { d: "The camera holds nearly the same top-down position, barely moving — holding the record button in focus.", tags: ["static"] },
  { d: "The view whips down to the textured, ridged side grip panel.", tags: ["whip-pan", "tilt-down"] },
  { d: "The camera continues drifting along the textured grip surface, shifting slightly downward.", tags: ["pan-right"] },
  { d: "The camera quickly zooms out, pulling back dramatically to reveal the whole assembled device centered in frame.", tags: ["pull-back", "zoom-out"] },
  { d: "The camera holds the same full-front view with barely any movement, the GoPro branding clearly visible.", tags: ["static"] },
];

for (let i = 0; i < frameRows.length - 1; i++) {
  const desc = descriptions[i] ?? { d: `Transition ${i + 1}: camera movement between frames.`, tags: ["orbit"] };
  await db.insert(schema.frameTransitions).values({
    documentId: docId,
    frameFromId: frameRows[i].id,
    frameToId: frameRows[i + 1].id,
    seqIndex: i + 1,
    description: desc.d,
    motionTags: desc.tags,
    aiProviderUsed: "seeded",
  });
}

await db.update(schema.documents)
  .set({ status: "done", contentType: "product_montage", updatedAt: new Date() })
  .where(eq(schema.documents.id, docId));

console.log(`Seeded ${frameRows.length - 1} transitions, marked document done.`);
await sql.end();
