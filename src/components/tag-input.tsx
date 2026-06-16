"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chips-style tag editor backed by a string[]. Enter or comma commits the draft;
 * Backspace on an empty draft removes the last chip. Case-insensitively de-duped.
 */
export function TagInput({
  value,
  onChange,
  placeholder = "Add a tag…",
  className,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const t = raw.replace(/,$/, "").trim();
    setDraft("");
    if (!t) return;
    if (value.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    onChange([...value, t]);
  }

  function remove(tag: string) {
    onChange(value.filter((x) => x !== tag));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring",
        className
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
        >
          {tag}
          <button
            type="button"
            onClick={() => remove(tag)}
            aria-label={`Remove ${tag}`}
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        placeholder={value.length === 0 ? placeholder : ""}
        className="h-7 min-w-[6rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
