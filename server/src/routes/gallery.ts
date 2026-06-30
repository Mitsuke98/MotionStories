import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";
import { aggregateMotionPatterns } from "../lib/motionAggregation.js";

export const galleryRouter = Router();

galleryRouter.get("/gallery", requireAuth, async (req: AuthedRequest, res) => {
  const patterns = await aggregateMotionPatterns(req.userId!);
  res.json({ patterns });
});
