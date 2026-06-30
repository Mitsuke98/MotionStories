import { GoogleGenerativeAI } from "@google/generative-ai";
import type { VisionProvider } from "./types.js";
import { buildPrompt, parseProviderJson } from "./types.js";

export const geminiProvider: VisionProvider = {
  async describeFramePair({ apiKey, imageABase64, imageBBase64, mimeType, promptContext }) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent([
      { text: "Frame A:" },
      { inlineData: { data: imageABase64, mimeType } },
      { text: "Frame B:" },
      { inlineData: { data: imageBBase64, mimeType } },
      { text: buildPrompt(promptContext) },
    ]);
    const text = result.response.text();
    return parseProviderJson(text);
  },
};
