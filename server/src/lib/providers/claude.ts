import Anthropic from "@anthropic-ai/sdk";
import type { VisionProvider } from "./types.js";
import { buildPrompt, parseProviderJson } from "./types.js";

export const claudeProvider: VisionProvider = {
  async describeFramePair({ apiKey, imageABase64, imageBBase64, mimeType, promptContext }) {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Frame A:" },
            {
              type: "image",
              source: { type: "base64", media_type: mimeType as any, data: imageABase64 },
            },
            { type: "text", text: "Frame B:" },
            {
              type: "image",
              source: { type: "base64", media_type: mimeType as any, data: imageBBase64 },
            },
            { type: "text", text: buildPrompt(promptContext) },
          ],
        },
      ],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude response had no text content");
    }
    return parseProviderJson(textBlock.text);
  },
};
