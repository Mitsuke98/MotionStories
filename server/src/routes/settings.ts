import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";
import { saveApiKey, listApiKeys, deleteApiKey } from "../lib/keyStore.js";
import { OPENROUTER_VISION_MODELS } from "../lib/providers/openrouter.js";

export const settingsRouter = Router();

settingsRouter.get("/providers/openrouter/models", requireAuth, (_req, res) => {
  res.json({ models: OPENROUTER_VISION_MODELS });
});

const VALID_PROVIDERS = ["claude", "openai", "gemini", "openrouter"];

settingsRouter.get("/api-keys", requireAuth, async (req: AuthedRequest, res) => {
  const keys = await listApiKeys(req.userId!);
  res.json({ keys });
});

settingsRouter.post("/api-keys", requireAuth, async (req: AuthedRequest, res) => {
  const { provider, label, apiKey } = req.body ?? {};
  if (!provider || !VALID_PROVIDERS.includes(provider) || !apiKey) {
    res.status(400).json({
      error: `provider (one of ${VALID_PROVIDERS.join(", ")}) and apiKey are required`,
    });
    return;
  }
  const row = await saveApiKey({
    userId: req.userId!,
    provider,
    label: label || provider,
    rawKey: apiKey,
  });
  res.status(201).json({
    id: row.id,
    provider: row.provider,
    label: row.label,
    maskedPreview: row.maskedPreview,
  });
});

settingsRouter.delete(
  "/api-keys/:id",
  requireAuth,
  async (req: AuthedRequest, res) => {
    await deleteApiKey(req.userId!, req.params.id);
    res.status(204).end();
  }
);
