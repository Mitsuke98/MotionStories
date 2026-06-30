import OpenAI from "openai";
import type { VisionProvider } from "./types.js";
import { buildPrompt, parseProviderJson } from "./types.js";

export const OPENROUTER_VISION_MODELS = [
  { value: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5 (Anthropic)" },
  { value: "openai/gpt-4o", label: "GPT-4o (OpenAI)" },
  { value: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash (Google)" },
  { value: "google/gemini-pro-1.5", label: "Gemini 1.5 Pro (Google)" },
  { value: "qwen/qwen2.5-vl-72b-instruct", label: "Qwen2.5-VL 72B" },
  { value: "meta-llama/llama-3.2-90b-vision-instruct", label: "Llama 3.2 90B Vision (Meta)" },
];

const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";

export const openrouterProvider: VisionProvider = {
  async describeFramePair({
    apiKey,
    imageABase64,
    imageBBase64,
    mimeType,
    promptContext,
    model,
  }: any) {
    const client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
    const response = await client.chat.completions.create({
      model: model || DEFAULT_MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Frame A:" },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageABase64}` },
            },
            { type: "text", text: "Frame B:" },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBBase64}` },
            },
            { type: "text", text: buildPrompt(promptContext) },
          ],
        },
      ],
    });
    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("OpenRouter response had no content");
    return parseProviderJson(text);
  },
};
