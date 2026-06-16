"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Lock, GripVertical } from "lucide-react";
import { LEAD_STAGES, scoreBand, sourceLabel } from "@/lib/leads";
import type { LeadSource, LeadStatus } from "@/lib/types";

export type BoardLead = {
  id: string;
  name: string;
  company: string | null;
  status: LeadStatus;
  score: number;
  est_value: number | null;
  currency: string;
  source: LeadSource;
  min_level: number;
};

export function LeadsBoard({ initialLeads }: { initialLeads: BoardLead[] }) {
  const supabase = createClient();
  const [leads, setLeads] = useState(initialLeads);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<LeadStatus | null>(null);
  const [error, setError] = useState("");

  const byStatus = useMemo(() => {
    const map: Record<string, BoardLead[]> = {};
    for (const c of LEAD_STAGES) map[c.key] = [];
    for (const l of leads) (map[l.status] ??= []).push(l);
    return map;
  }, [leads]);

  async function move(id: string, status: LeadStatus) {
    const current = leads.find((l) => l.id === id);
    if (!current || current.status === status) return;
    const prev = leads;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    const { error } = await (supabase.from("leads") as any).update({ status }).eq("id", id);
    if (error) {
      setError(error.message);
      setLeads(prev);
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3">
        {LEAD_STAGES.map((col) => {
          const items = byStatus[col.key] ?? [];
          const total = items.reduce((s, l) => s + (l.est_value ?? 0), 0);
          const isOver = overCol === col.key;
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.key);
              }}
              onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) move(dragId, col.key);
                setDragId(null);
                setOverCol(null);
              }}
              className={cn(
                "w-[15.5rem] shrink-0 snap-start rounded-lg border border-t-2 bg-surface/60 p-2.5 transition-colors",
                col.accent,
                isOver && "bg-accent/50 ring-2 ring-primary/30"
              )}
            >
              <div className="flex items-baseline justify-between px-1 pb-1">
                <div className="text-sm font-semibold">{col.label}</div>
                <div className="text-xs text-muted-foreground tnum">{items.length}</div>
              </div>
              <div className="px-1 pb-2 text-xs font-medium text-muted-foreground tnum">
                {formatCurrency(total, items[0]?.currency ?? "INR")}
              </div>

              <div className="min-h-[3rem] space-y-2">
                {items.map((l) => {
                  const band = scoreBand(l.score);
                  return (
                    <article
                      key={l.id}
                      draggable
                      onDragStart={() => setDragId(l.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverCol(null);
                      }}
                      className={cn(
                        "group cursor-grab rounded-md border bg-card p-2.5 shadow-xs transition-shadow hover:shadow-md active:cursor-grabbing",
                        dragId === l.id && "opacity-40"
                      )}
                    >
                      <div className="flex items-start gap-1.5">
                        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/leads/${l.id}`}
                            className="block truncate text-sm font-medium hover:underline"
                            draggable={false}
                          >
                            {l.name}
                          </Link>
                          <div className="mt-0.5 flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                            <span className="truncate">{l.company ?? sourceLabel(l.source)}</span>
                            {l.min_level > 5 && <Lock className="h-3 w-3 text-gold" />}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold tnum">
                          {formatCurrency(l.est_value, l.currency)}
                        </span>
                        <Badge variant={band.variant}>{l.score}</Badge>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: drag a lead across stages — New → Qualified → Proposal → Negotiation → Won/Lost.
      </p>
    </div>
  );
}
