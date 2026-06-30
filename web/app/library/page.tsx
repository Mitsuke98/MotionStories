"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { NavBar } from "@/components/NavBar";

const STATUS_STYLES: Record<string, string> = {
  done: "text-emerald-600 dark:text-emerald-400",
  processing: "text-amber-600 dark:text-amber-400",
  failed: "text-[var(--color-destructive)]",
};

export default function LibraryPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    api
      .listDocuments(filter || undefined)
      .then((r) => setDocs(r.documents))
      .catch(() => setDocs([]));
  }, [filter]);

  const contentTypes = ["product_montage", "tutorial", "vlog", "other"];

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <NavBar />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Library</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Every video you've analyzed, saved and ready to revisit.
          </p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-auto">
          <option value="">All types</option>
          {contentTypes.map((t) => (
            <option key={t} value={t}>
              {t.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {docs.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            No documents yet.{" "}
            <a href="/" className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline">
              Analyze a video
            </a>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {docs.map((d) => (
            <a key={d.id} href={`/library/${d.id}`} className="card card-hover block">
              <div className="mb-2 truncate font-semibold">{d.title}</div>
              <div className="flex items-center justify-between">
                <span className="badge">{d.contentType.replace("_", " ")}</span>
                <span className={`text-xs font-medium capitalize ${STATUS_STYLES[d.status] || "text-[var(--color-muted)]"}`}>
                  {d.status}
                </span>
              </div>
              <div className="mt-2 text-xs text-[var(--color-muted)]">
                {new Date(d.createdAt).toLocaleDateString()}
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
