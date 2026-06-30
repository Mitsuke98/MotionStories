"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ProviderSelect } from "@/components/ProviderSelect";
import { NavBar } from "@/components/NavBar";

export default function AnalyzePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!provider) {
      setError("Choose an AI provider first.");
      return;
    }
    if (provider === "openrouter" && !model) {
      setError("Choose a model for OpenRouter.");
      return;
    }
    if (!url && !file) {
      setError("Paste a video URL or upload a file.");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("provider", provider);
      if (model) form.set("model", model);
      if (url) form.set("url", url);
      if (file) form.set("file", file);
      const { documentId } = await api.createJob(form);
      router.push(`/jobs/${documentId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
      <NavBar />
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analyze a video</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Paste a video URL or upload a file. We'll extract frames and describe the camera and
          subject motion between them, in plain English.
        </p>
      </div>

      <p className="mb-6 rounded-[var(--radius-md)] border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-300">
        Downloading from platforms like YouTube/TikTok/Instagram may be subject to that
        platform's Terms of Service. Only analyze content you have rights to use.
      </p>

      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label">Video URL</label>
          <input
            type="url"
            placeholder="https://example.com/video"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="input"
          />
        </div>
        <div className="flex items-center gap-3 text-xs font-medium text-[var(--color-muted)]">
          <span className="h-px flex-1 bg-[var(--color-border)]" />
          OR
          <span className="h-px flex-1 bg-[var(--color-border)]" />
        </div>
        <div>
          <label className="label">Upload a file</label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full cursor-pointer rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-muted)] file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[var(--color-muted-surface)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--color-foreground)]"
          />
        </div>
        <div>
          <label className="label">AI Provider</label>
          <ProviderSelect value={provider} onChange={setProvider} model={model} onModelChange={setModel} />
        </div>
        {error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Starting…" : "Analyze video"}
        </button>
      </form>
    </main>
  );
}
