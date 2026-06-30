"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { NavBar } from "@/components/NavBar";

export default function JobStatusPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<string>("processing");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const doc = await api.getDocument(params.id);
        if (cancelled) return;
        setStatus(doc.doc.status);
        if (doc.doc.status === "done") {
          router.push(`/library/${params.id}`);
          return;
        }
        if (doc.doc.status === "failed") {
          setError(doc.doc.errorMessage || "Processing failed.");
          return;
        }
        setTimeout(poll, 2500);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      }
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  return (
    <main className="mx-auto max-w-xl px-4 pb-16 sm:px-6">
      <NavBar />
      <div className="card flex flex-col items-center gap-4 py-12 text-center">
        <span
          className="flex h-12 w-12 animate-spin items-center justify-center rounded-full border-2 border-transparent"
          style={{ borderTopColor: "var(--color-primary)", borderRightColor: "var(--color-accent)" }}
        />
        <h1 className="text-xl font-bold tracking-tight">Analyzing your video…</h1>
        {error ? (
          <div className="flex flex-col items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <p className="font-semibold">Analysis failed</p>
            <p className="max-w-sm text-sm text-[var(--color-destructive)]">{error}</p>
            <a href="/" className="btn-primary mt-2">Try again</a>
          </div>
        ) : (
          <>
            <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[var(--color-muted-surface)]">
              <div
                className="h-full w-1/2 animate-pulse rounded-full"
                style={{ background: "linear-gradient(90deg, var(--color-primary), var(--color-accent))" }}
              />
            </div>
            <p className="max-w-sm text-sm text-[var(--color-muted)]">
              Status: {status}. Downloading, extracting frames, and describing motion — this can
              take 30 seconds to a couple of minutes depending on video length.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
