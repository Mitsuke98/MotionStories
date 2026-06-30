"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { NavBar } from "@/components/NavBar";

export default function GalleryPage() {
  const [patterns, setPatterns] = useState<any[]>([]);

  useEffect(() => {
    api
      .getGallery()
      .then((r) => setPatterns(r.patterns))
      .catch(() => setPatterns([]));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <NavBar />
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Motion Insights Gallery</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Camera and subject motion patterns found across all your analyzed videos — browse for
          inspiration when planning your next shoot.
        </p>
      </div>

      {patterns.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            Nothing here yet — analyze a few videos and patterns will show up automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {patterns.map((p) => (
            <div key={p.tag}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-lg font-semibold capitalize">{p.tag.replace(/-/g, " ")}</h2>
                <span className="badge-accent">{p.count} uses</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {p.examples.map((ex: any, i: number) => (
                  <a key={i} href={`/library/${ex.documentId}`} className="card card-hover block">
                    <div className="mb-2 grid grid-cols-2 gap-1">
                      <img
                        src={ex.frameFromUrl}
                        className="aspect-[9/16] w-full rounded-[var(--radius-md)] object-cover"
                      />
                      <img
                        src={ex.frameToUrl}
                        className="aspect-[9/16] w-full rounded-[var(--radius-md)] object-cover"
                      />
                    </div>
                    <div className="truncate text-xs font-medium text-[var(--color-muted)]">
                      {ex.documentTitle}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--color-foreground)]">
                      {ex.description}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
