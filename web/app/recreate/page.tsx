"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ProviderSelect } from "@/components/ProviderSelect";
import { NavBar } from "@/components/NavBar";

export default function RecreatePage() {
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [sourceDocumentId, setSourceDocumentId] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .listDocuments()
      .then((r) => setDocs(r.documents.filter((d: any) => d.status === "done")))
      .catch(() => setDocs([]));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!sourceDocumentId || !provider || !file) {
      setError("Pick a source video, a provider, and upload a subject photo.");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("sourceDocumentId", sourceDocumentId);
      form.set("provider", provider);
      if (model) form.set("model", model);
      form.set("subjectImage", file);
      const { blueprintId } = await api.createRecreate(form);
      router.push(`/recreate/${blueprintId}`);
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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Recreate Studio</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Pick an analyzed video as a structural reference, upload a photo of your new subject or
          product, and get a shot-list blueprint describing how to recreate the same camera and
          subject motion with your subject. This generates a document you can film yourself or
          hand to an editor — AI video rendering is coming in a future version.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label">Reference video</label>
          <select
            value={sourceDocumentId}
            onChange={(e) => setSourceDocumentId(e.target.value)}
            className="input"
          >
            <option value="">Choose a reference video from your Library…</option>
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">New subject photo</label>
          <input
            type="file"
            accept="image/*"
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
          {submitting ? "Generating…" : "Generate shot-list blueprint"}
        </button>
      </form>
    </main>
  );
}
