"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { FrameStep } from "@/components/FrameStep";

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  async function load() {
    const r = await api.getDocument(params.id);
    setData(r);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <NavBar />
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </main>
    );
  }

  const framesById = new Map(data.frames.map((f: any) => [f.id, f]));

  async function submitFeedback() {
    await api.submitFeedback(params.id, { text: feedbackText });
    setFeedbackSent(true);
    setFeedbackText("");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <NavBar />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{data.doc.title}</h1>
          <span className="badge mt-2 inline-block">{data.doc.contentType.replace("_", " ")}</span>
        </div>
        <a href={api.exportUrl(params.id)} className="btn-secondary shrink-0">
          Export PDF
        </a>
      </div>

      <div className="space-y-4">
        {data.transitions.map((t: any, i: number) => {
          const frameFrom = framesById.get(t.frameFromId) as any;
          const frameTo = framesById.get(t.frameToId) as any;
          return (
            <FrameStep
              key={t.id}
              stepNumber={i + 1}
              frameFromUrl={frameFrom?.storageUrl ?? ""}
              frameToUrl={frameTo?.storageUrl ?? ""}
              description={t.description}
              motionTags={t.motionTags}
              editable
              onSaveDescription={async (text) => {
                await api.updateTransition(params.id, t.id, text);
                await load();
              }}
            />
          );
        })}
      </div>

      <div className="card mt-8">
        <h2 className="mb-2 font-semibold">Leave feedback on this document</h2>
        {feedbackSent ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Thanks for the feedback!</p>
        ) : (
          <div className="flex gap-2">
            <input
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="What worked, what didn't?"
              className="input flex-1"
            />
            <button onClick={submitFeedback} className="btn-primary shrink-0">
              Send
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
