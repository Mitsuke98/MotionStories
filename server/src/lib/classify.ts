const CONTENT_TYPE_KEYWORDS: Record<string, string[]> = {
  product_montage: ["product", "logo", "device", "exploded", "reveal", "camera", "phone"],
  tutorial: ["step", "how to", "first,", "next,", "demonstrate", "craft", "instructions"],
  vlog: ["talking", "walking", "i'm", "we're", "person speaks"],
};

/**
 * Cheap keyword-based classifier for v1 — looks at the combined transition
 * descriptions and votes for the best-matching content type. Can be swapped
 * for an AI classification call later without changing callers.
 */
export function classifyContentType(descriptions: string[]): string {
  const combined = descriptions.join(" ").toLowerCase();
  let best = "other";
  let bestScore = 0;
  for (const [type, keywords] of Object.entries(CONTENT_TYPE_KEYWORDS)) {
    const score = keywords.filter((k) => combined.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      best = type;
    }
  }
  return best;
}
