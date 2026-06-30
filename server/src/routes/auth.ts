import { Router } from "express";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  signSession,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  type AuthedRequest,
} from "../lib/auth.js";

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password || password.length < 8) {
    res.status(400).json({ error: "Email and a password of 8+ chars are required" });
    return;
  }
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }
  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning();
  setSessionCookie(res, signSession(user.id));
  res.status(201).json({ id: user.id, email: user.email });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = await db.query.users.findFirst({
    where: eq(users.email, email ?? ""),
  });
  if (!user || !(await verifyPassword(password ?? "", user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  setSessionCookie(res, signSession(user.id));
  res.json({ id: user.id, email: user.email });
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, req.userId!),
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ id: user.id, email: user.email });
});
