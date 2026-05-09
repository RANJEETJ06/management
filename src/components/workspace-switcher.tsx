"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type Membership = { org_id: string; role: string; org_name: string };

export function WorkspaceSwitcher({
  memberships,
  activeOrgId,
  pendingCount,
}: {
  memberships: Membership[];
  activeOrgId: string;
  pendingCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const active = memberships.find((m) => m.org_id === activeOrgId);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function switchTo(orgId: string) {
    if (orgId === activeOrgId) {
      setOpen(false);
      return;
    }
    setBusyId(orgId);
    try {
      const res = await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      if (res.ok) {
        setOpen(false);
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full text-left rounded-md border bg-card px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between gap-2"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Workspace
          </div>
          <div className="text-sm font-semibold truncate">
            {active?.org_name ?? "Workspace"}
          </div>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg p-1"
        >
          <div className="max-h-64 overflow-y-auto">
            {memberships.map((m) => {
              const selected = m.org_id === activeOrgId;
              return (
                <button
                  key={m.org_id}
                  role="option"
                  aria-selected={selected}
                  onClick={() => switchTo(m.org_id)}
                  disabled={busyId !== null}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-sm flex items-center gap-2 text-sm hover:bg-accent transition-colors",
                    selected && "bg-accent/50"
                  )}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      selected ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1 truncate">{m.org_name}</span>
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {m.role}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t mt-1 pt-1">
            {pendingCount > 0 && (
              <Link
                href="/invitations"
                onClick={() => setOpen(false)}
                className="w-full px-2 py-1.5 rounded-sm flex items-center gap-2 text-sm hover:bg-accent transition-colors"
              >
                <Inbox className="h-4 w-4 shrink-0" />
                <span className="flex-1">Pending invitations</span>
                <span className="text-xs font-semibold rounded-full bg-amber-100 text-amber-900 px-2">
                  {pendingCount}
                </span>
              </Link>
            )}
            <Link
              href="/workspaces/new"
              onClick={() => setOpen(false)}
              className="w-full px-2 py-1.5 rounded-sm flex items-center gap-2 text-sm hover:bg-accent transition-colors"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="flex-1">Create workspace</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
