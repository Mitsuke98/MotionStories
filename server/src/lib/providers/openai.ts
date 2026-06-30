import OpenAI from "openai";
import type { VisionProvider } from "./types.js";
import { buildPrompt, parseProviderJson } from "./types.js";

export const openaiProvider: VisionProvider = {
  async describeFramePair({ apiKey, imageABase64, imageBBase64, mimeType, promptContext }) {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o",
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
    if (!text) throw new Error("OpenAI response had no content");
    return parseProviderJson(text);
  },
};
