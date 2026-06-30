"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { NavBar } from "@/components/NavBar";

const PROVIDERS = [
  { value: "claude", label: "Claude (Anthropic)" },
  { value: "openai", label: "OpenAI (GPT-4o)" },
  { value: "gemini", label: "Gemini (Google)" },
  { value: "openrouter", label: "OpenRouter (choose model per request)" },
];

export default function SettingsPage() {
  const [keys, setKeys] = useState<Array<{ id: string; provider: string; label: string; maskedPreview: string }>>([]);
  const [provider, setProvider] = useState("claude");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const r = await api.listApiKeys();
    setKeys(r.keys);
  }

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.addApiKey(provider, label || provider, apiKey);
      setApiKey("");
      setLabel("");
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    await api.deleteApiKey(id);
    await refresh();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
      <NavBar />
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Bring your own API key for any AI provider. Keys are encrypted at rest and only ever
          shown masked after saving — you're billed directly by the provider for usage.
        </p>
      </div>

      <form onSubmit={onAdd} className="card mb-8 space-y-3">
        <h2 className="font-semibold">Add a new key</h2>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="input"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          placeholder="Label (optional, e.g. 'personal key')"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="input"
        />
        <input
          type="password"
          required
          placeholder="API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="input"
        />
        {error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save key"}
        </button>
      </form>

      <h2 className="mb-3 font-semibold">Saved keys</h2>
      {keys.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No keys saved yet.</p>
      ) : (
        <ul className="space-y-2">
          {keys.map((k) => (
            <li
              key={k.id}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm"
            >
              <div>
                <span className="font-medium">{k.label}</span>{" "}
                <span className="text-[var(--color-muted)]">
                  ({k.provider}) — {k.maskedPreview}
                </span>
              </div>
              <button onClick={() => onDelete(k.id)} className="cursor-pointer text-[var(--color-destructive)] hover:underline">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
