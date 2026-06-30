"use client";

import { useState } from "react";

export interface FrameStepProps {
  stepNumber: number;
  frameFromUrl: string;
  frameToUrl: string;
  description: string;
  motionTags?: string[];
  editable?: boolean;
  onSaveDescription?: (newText: string) => Promise<void>;
}

export function FrameStep({
  stepNumber,
  frameFromUrl,
  frameToUrl,
  description,
  motionTags,
  editable,
  onSaveDescription,
}: FrameStepProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(description);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!onSaveDescription) return;
    setSaving(true);
    try {
      await onSaveDescription(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card card-hover">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
        >
          {stepNumber}
        </span>
        <span className="text-sm font-semibold text-[var(--color-muted)]">Step {stepNumber}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <img
          src={frameFromUrl}
          alt={`Frame ${stepNumber} start`}
          className="aspect-[9/16] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] object-cover"
        />
        <img
          src={frameToUrl}
          alt={`Frame ${stepNumber} end`}
          className="aspect-[9/16] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] object-cover"
        />
      </div>
      <div className="mt-3">
        {editing ? (
          <div className="space-y-2">
            <textarea
              className="input"
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="btn-primary text-xs">
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setDraft(description);
                  setEditing(false);
                }}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            className={`rounded-[var(--radius-md)] p-1.5 text-sm leading-relaxed text-[var(--color-foreground)] ${
              editable ? "cursor-pointer transition-colors duration-150 hover:bg-[var(--color-muted-surface)]" : ""
            }`}
            onClick={() => editable && setEditing(true)}
            title={editable ? "Click to edit" : undefined}
          >
            {description}
          </p>
        )}
        {motionTags && motionTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {motionTags.map((tag) => (
              <span key={tag} className="badge-accent">
                {tag.replace(/-/g, " ")}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
