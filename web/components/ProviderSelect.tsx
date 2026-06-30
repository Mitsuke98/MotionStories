"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function ProviderSelect({
  value,
  onChange,
  model,
  onModelChange,
}: {
  value: string;
  onChange: (v: string) => void;
  model?: string;
  onModelChange?: (v: string) => void;
}) {
  const [keys, setKeys] = useState<Array<{ provider: string; label: string; maskedPreview: string }>>([]);
  const [orModels, setOrModels] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    api
      .listApiKeys()
      .then((r) => {
        setKeys(r.keys);
        // Auto-select the only key if there's just one and nothing is selected yet
        if (r.keys.length === 1 && !value) {
          onChange(r.keys[0].provider);
        }
      })
      .catch(() => setKeys([]));
  }, []);

  useEffect(() => {
    if (value === "openrouter") {
      api
        .getOpenrouterModels()
        .then((r) => setOrModels(r.models))
        .catch(() => setOrModels([]));
    }
  }, [value]);

  if (keys.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-300">
        No API keys saved yet.{" "}
        <a href="/settings" className="font-semibold underline underline-offset-2">
          Add one in Settings
        </a>{" "}
        before analyzing a video.
      </div>
    );
  }

  const selectedKey = keys.find((k) => k.provider === value);

  return (
    <div className="space-y-2">
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select an AI provider…</option>
        {keys.map((k) => (
          <option key={k.provider} value={k.provider}>
            {k.label} ({k.provider}) — {k.maskedPreview}
          </option>
        ))}
      </select>
      {selectedKey && (
        <p className="text-xs text-[var(--color-muted)]">
          Using <span className="font-medium text-[var(--color-foreground)]">{selectedKey.label}</span>{" "}
          <span className="font-mono">{selectedKey.maskedPreview}</span>
          {" · "}
          <a href="/settings" className="text-[var(--color-primary)] hover:underline">
            Manage keys
          </a>
        </p>
      )}

      {value === "openrouter" && onModelChange && (
        <select
          className="input"
          value={model || ""}
          onChange={(e) => onModelChange(e.target.value)}
        >
          <option value="">Choose a model…</option>
          {orModels.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
