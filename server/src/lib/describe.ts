import fs from "node:fs/promises";
import { getProvider } from "./providers/index.js";
import type { FramePairDescription } from "./providers/types.js";

export async function describeFramePair(opts: {
  provider: string;
  apiKey: string;
  imagePathA: string;
  imagePathB: string;
  promptContext?: string;
  model?: string;
}): Promise<FramePairDescription> {
  const [bufA, bufB] = await Promise.all([
    fs.readFile(opts.imagePathA),
    fs.readFile(opts.imagePathB),
  ]);
  const vision = getProvider(opts.provider);
  return vision.describeFramePair({
    apiKey: opts.apiKey,
    imageABase64: bufA.toString("base64"),
    imageBBase64: bufB.toString("base64"),
    mimeType: "image/png",
    promptContext: opts.promptContext,
    model: opts.model,
  });
}
