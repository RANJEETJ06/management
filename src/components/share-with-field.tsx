"use client";

import { Label } from "@/components/ui/label";
import { Users, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type ShareMember = {
  user_id: string;
  email: string;
  level: number;
};

/**
 * "Also visible to" — grant named teammates access to a restricted record even
 * when their clearance sits below the record's level. Only meaningful once the
 * record is actually restricted (min_level > 1), so it hides itself otherwise.
 */
export function ShareWithField({
  members,
  value,
  onChange,
  minLevel,
  className,
}: {
  members: ShareMember[];
  value: string[];
  onChange: (ids: string[]) => void;
  minLevel: number;
  className?: string;
}) {
  if ((minLevel ?? 1) <= 1 || members.length === 0) return null;

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  return (
    <div className={className}>
      <Label className="flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-primary" /> Also visible to
      </Label>
      <div className="max-h-44 divide-y overflow-y-auto rounded-md border">
        {members.map((m) => {
          const selected = value.includes(m.user_id);
          const alreadySees = m.level >= minLevel;
          return (
            <button
              type="button"
              key={m.user_id}
              onClick={() => toggle(m.user_id)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/40"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  )}
                >
                  {selected && <Check className="h-3 w-3" />}
                </span>
                <span className="truncate">{m.email}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {alreadySees ? `L${m.level} · already sees` : `L${m.level}`}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Selected teammates can see this record regardless of their clearance.
      </p>
    </div>
  );
}
