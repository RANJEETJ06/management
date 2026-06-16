"use client";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Lock, Globe } from "lucide-react";
import { assignableLevels, levelMeta } from "@/lib/levels";

/**
 * Sensitivity picker — sets a record's `min_level`. A record is only visible to
 * teammates whose clearance >= this level. You can never tag a record above
 * your own clearance (you'd hide it from yourself), so the options are capped.
 *
 * When the current user is at level 1 there is nothing to restrict, so the
 * control quietly renders nothing.
 */
export function SensitivityField({
  value,
  onChange,
  userLevel,
  floor = 1,
  className,
}: {
  value: number;
  onChange: (level: number) => void;
  userLevel: number;
  /** Lowest level this record may be tagged with (the feature's floor). */
  floor?: number;
  className?: string;
}) {
  const cap = Math.min(5, Math.max(1, Math.round(userLevel || 1)));
  const lo = Math.min(cap, Math.max(1, Math.round(floor || 1)));
  // Nothing to choose when the user is at the floor (or the workspace floor).
  if (cap <= 1 || lo >= cap) return null;
  const options = assignableLevels(cap).filter((o) => o.level >= lo);
  const restricted = (value ?? 1) > 1;

  return (
    <div className={className}>
      <Label className="flex items-center gap-1.5">
        {restricted ? (
          <Lock className="h-3.5 w-3.5 text-gold" />
        ) : (
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        Visibility
      </Label>
      <Select
        value={String(value ?? 1)}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {options.map((o) => (
          <option key={o.level} value={o.level}>
            {o.level === 1
              ? "Open to all (everyone in workspace)"
              : `${o.tag} — clearance ${o.level}+ only`}
          </option>
        ))}
      </Select>
      <p className="mt-1 text-xs text-muted-foreground">
        {restricted
          ? `Hidden from anyone below clearance ${value} (${levelMeta(value).name}).`
          : "Visible to your whole workspace."}
      </p>
    </div>
  );
}
