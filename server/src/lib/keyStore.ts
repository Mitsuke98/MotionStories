import crypto from "node:crypto";
import { db } from "../db/client.js";
import { apiKeys } from "../db/schema.js";
import { and, eq } from "drizzle-orm";

const ALGO = "aes-256-gcm";

function getMasterKey(): Buffer {
  const secret = process.env.KEY_ENCRYPTION_SECRET;
  if (!secret) throw new Error("KEY_ENCRYPTION_SECRET is not set");
  // Accept hex or base64; fall back to hashing arbitrary strings to 32 bytes.
  if (/^[0-9a-fA-F]{64}$/.test(secret)) return Buffer.from(secret, "hex");
  try {
    const b = Buffer.from(secret, "base64");
    if (b.length === 32) return b;
  } catch {
    /* ignore */
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptKey(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getMasterKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(
    ":"
  );
}

export function decryptKey(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  const decipher = crypto.createDecipheriv(
    ALGO,
    getMasterKey(),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function maskKey(plaintext: string): string {
  if (plaintext.length <= 8) return "****";
  return `${plaintext.slice(0, 6)}...${plaintext.slice(-4)}`;
}

export async function saveApiKey(opts: {
  userId: string;
  provider: string;
  label: string;
  rawKey: string;
}) {
  const [row] = await db
    .insert(apiKeys)
    .values({
      userId: opts.userId,
      provider: opts.provider,
      label: opts.label,
      encryptedKey: encryptKey(opts.rawKey),
      maskedPreview: maskKey(opts.rawKey),
    })
    .returning();
  return row;
}

export async function listApiKeys(userId: string) {
  const rows = await db.query.apiKeys.findMany({
    where: eq(apiKeys.userId, userId),
  });
  return rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    label: r.label,
    maskedPreview: r.maskedPreview,
    createdAt: r.createdAt,
    lastUsedAt: r.lastUsedAt,
  }));
}

export async function deleteApiKey(userId: string, id: string) {
  await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
}

export async function getActiveKeyForProvider(
  userId: string,
  provider: string
): Promise<string | null> {
  const row = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider)),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  if (!row) return null;
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id));
  return decryptKey(row.encryptedKey);
}
