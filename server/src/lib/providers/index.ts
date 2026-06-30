import type { VisionProvider } from "./types.js";
import { claudeProvider } from "./claude.js";
import { openaiProvider } from "./openai.js";
import { geminiProvider } from "./gemini.js";
import { openrouterProvider } from "./openrouter.js";

const registry: Record<string, VisionProvider> = {
  claude: claudeProvider,
  openai: openaiProvider,
  gemini: geminiProvider,
  openrouter: openrouterProvider,
};

export function getProvider(name: string): VisionProvider {
  const provider = registry[name];
  if (!provider) {
    throw new Error(
      `Unknown AI provider "${name}". Supported: ${Object.keys(registry).join(", ")}`
    );
  }
  return provider;
}
