export interface FramePairDescription {
  description: string;
  motionTags: string[];
}

export interface VisionProvider {
  describeFramePair(opts: {
    apiKey: string;
    imageABase64: string;
    imageBBase64: string;
    mimeType: string;
    promptContext?: string;
    model?: string;
  }): Promise<FramePairDescription>;
}

export const MOTION_TAG_VOCAB = [
  "pan-left",
  "pan-right",
  "tilt-up",
  "tilt-down",
  "zoom-in",
  "zoom-out",
  "rotate",
  "exploded-view",
  "pull-back",
  "push-in",
  "cut",
  "fade",
  "static",
  "whip-pan",
  "dolly",
  "orbit",
] as const;

export function buildPrompt(promptContext?: string): string {
  return `You are analyzing two consecutive frames extracted one second apart from a video.
Describe in one or two plain-English sentences, understandable by anyone (no jargon),
what happened between Frame A and Frame B - focus on camera movement (pan, zoom, rotate,
cut, fade, pull back, etc.) and/or subject motion.
${promptContext ? `Context: ${promptContext}\n` : ""}
Then classify the transition using 1-3 short tags from this vocabulary only: ${MOTION_TAG_VOCAB.join(", ")}.

Respond ONLY with strict JSON in this exact shape, no markdown fences:
{"description": "...", "motionTags": ["...", "..."]}`;
}

export function parseProviderJson(text: string): FramePairDescription {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  const parsed = JSON.parse(cleaned);
  return {
    description: String(parsed.description ?? "").trim(),
    motionTags: Array.isArray(parsed.motionTags)
      ? parsed.motionTags.map((t: unknown) => String(t))
      : [],
  };
}
