"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { NavBar } from "@/components/NavBar";

export default function RecreateResultPage() {
  const params = useParams<{ id: string }>();
  const [blueprint, setBlueprint] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const b = await api.getRecreate(params.id);
      if (cancelled) return;
      setBlueprint(b);
      if (b.status === "processing") setTimeout(poll, 2500);
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <NavBar />
      <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">Shot-list blueprint</h1>

      {!blueprint || blueprint.status === "processing" ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <span
            className="flex h-10 w-10 animate-spin items-center justify-center rounded-full border-2 border-transparent"
            style={{ borderTopColor: "var(--color-primary)", borderRightColor: "var(--color-accent)" }}
          />
          <p className="text-sm text-[var(--color-muted)]">Generating your shot list…</p>
        </div>
      ) : blueprint.status === "failed" ? (
        <div className="card text-sm text-[var(--color-destructive)]">
          Blueprint generation failed. Try again.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card">
            <div className="label">Your new subject</div>
            <img
              src={blueprint.newSubjectImageUrl}
              className="max-h-64 rounded-[var(--radius-md)] border border-[var(--color-border)] object-contain"
            />
          </div>
          {blueprint.shotList?.map((shot: any) => (
            <div key={shot.shotNumber} className="card">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
                >
                  {shot.shotNumber}
                </span>
                <span className="text-sm font-semibold text-[var(--color-muted)]">
                  Shot {shot.shotNumber}
                </span>
              </div>
              <img
                src={shot.referenceFrameUrl}
                className="mb-2 aspect-[9/16] w-32 rounded-[var(--radius-md)] border border-[var(--color-border)] object-cover"
                alt="Reference frame"
              />
              <p className="text-sm leading-relaxed">{shot.description}</p>
              {shot.motionTags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {shot.motionTags.map((tag: string) => (
                    <span key={tag} className="badge-accent">
                      {tag.replace(/-/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
