// Clearance / sensitivity ladder for Lupin.
//   Level 5 sits at the top of the hierarchy and sees everything;
//   level 1 is the floor and sees only data tagged "open to all".
// A record tagged with min_level N is visible to members whose clearance >= N.

import type { Level } from "@/lib/types";

export type LevelMeta = {
  level: Level;
  name: string; // org-role flavour for the clearance
  tag: string; // short sensitivity label for records
};

export const LEVELS: LevelMeta[] = [
  { level: 1, name: "Junior staff", tag: "Open to all" },
  { level: 2, name: "Senior staff", tag: "Senior+" },
  { level: 3, name: "Lead", tag: "Lead+" },
  { level: 4, name: "Manager", tag: "Manager+" },
  { level: 5, name: "Director", tag: "Director only" },
];

export function levelMeta(level: number): LevelMeta {
  const clamped = Math.min(5, Math.max(1, Math.round(level || 1)));
  return LEVELS[clamped - 1];
}

export function levelName(level: number): string {
  return levelMeta(level).name;
}

export function sensitivityTag(minLevel: number): string {
  return levelMeta(minLevel).tag;
}

/** Levels a member can assign as a record's min_level — never above their own. */
export function assignableLevels(myLevel: number): LevelMeta[] {
  const cap = Math.min(5, Math.max(1, Math.round(myLevel || 1)));
  return LEVELS.slice(0, cap);
}

export function isRestricted(minLevel: number): boolean {
  return (minLevel ?? 1) > 1;
}
