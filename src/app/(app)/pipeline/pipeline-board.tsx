"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Lock, ArrowDownLeft, ArrowUpRight, GripVertical } from "lucide-react";
import type { DealStatus, PaymentStatus } from "@/lib/types";

export type PipelineDeal = {
  id: string;
  deal_date: string;
  direction: "buy" | "sell";
  status: DealStatus;
  payment_status: PaymentStatus;
  amount_total: number | null;
  amount_paid: number;
  currency: string;
  min_level: number;
  contact_name: string | null;
};

const COLUMNS: { key: DealStatus; label: string; accent: string }[] = [
  { key: "pending", label: "Pending", accent: "border-t-gold" },
  { key: "confirmed", label: "Confirmed", accent: "border-t-primary/60" },
  { key: "delivered", label: "Delivered", accent: "border-t-primary" },
  { key: "paid", label: "Paid", accent: "border-t-primary" },
  { key: "cancelled", label: "Cancelled", accent: "border-t-destructive/60" },
];

const PAY_BADGE: Record<PaymentStatus, "warn" | "success" | "muted"> = {
  unpaid: "warn",
  partial: "warn",
  paid: "success",
};

export function PipelineBoard({ initialDeals }: { initialDeals: PipelineDeal[] }) {
  const supabase = createClient();
  const [deals, setDeals] = useState(initialDeals);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<DealStatus | null>(null);
  const [error, setError] = useState("");

  const byStatus = useMemo(() => {
    const map: Record<string, PipelineDeal[]> = {};
    for (const c of COLUMNS) map[c.key] = [];
    for (const d of deals) (map[d.status] ??= []).push(d);
    return map;
  }, [deals]);

  async function move(id: string, status: DealStatus) {
    const current = deals.find((d) => d.id === id);
    if (!current || current.status === status) return;
    const prev = deals;
    setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, status } : d)));
    const { error } = await (supabase.from("deals") as any)
      .update({ status })
      .eq("id", id);
    if (error) {
      setError(error.message);
      setDeals(prev); // roll back
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x">
        {COLUMNS.map((col) => {
          const items = byStatus[col.key] ?? [];
          const total = items.reduce((s, d) => s + (d.amount_total ?? 0), 0);
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
              <div className="flex items-baseline justify-between px-1 pb-2">
                <div className="text-sm font-semibold">{col.label}</div>
                <div className="text-xs text-muted-foreground tnum">{items.length}</div>
              </div>
              <div className="px-1 pb-2 text-xs font-medium text-muted-foreground tnum">
                {formatCurrency(total, items[0]?.currency ?? "INR")}
              </div>

              <div className="space-y-2 min-h-[3rem]">
                {items.map((d) => (
                  <article
                    key={d.id}
                    draggable
                    onDragStart={() => setDragId(d.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                    className={cn(
                      "group rounded-md border bg-card p-2.5 shadow-xs cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md",
                      dragId === d.id && "opacity-40"
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/deals/${d.id}`}
                          className="block truncate text-sm font-medium hover:underline"
                          draggable={false}
                        >
                          {d.contact_name ?? "(no contact)"}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                          {d.direction === "buy" ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {formatDate(d.deal_date)}
                          {d.min_level > 1 && (
                            <Lock className="h-3 w-3 text-gold" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold tnum">
                        {formatCurrency(d.amount_total, d.currency)}
                      </span>
                      <Badge variant={PAY_BADGE[d.payment_status]}>{d.payment_status}</Badge>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: drag a card into another column to update its stage instantly.
      </p>
    </div>
  );
}
