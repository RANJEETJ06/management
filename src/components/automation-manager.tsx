"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AUTOMATION_RULES } from "@/lib/admin";
import type { AutomationKind } from "@/lib/types";

type RuleState = { enabled: boolean; config: Record<string, string> };
type Member = { user_id: string; email: string };

export function AutomationManager({
  orgId,
  initial,
  members,
}: {
  orgId: string;
  initial: Record<string, RuleState>;
  members: Member[];
}) {
  const supabase = createClient();
  const [rules, setRules] = useState<Record<string, RuleState>>(initial);
  const [error, setError] = useState("");

  function setLocal(kind: AutomationKind, next: RuleState) {
    setRules((r) => ({ ...r, [kind]: next }));
  }

  async function persist(kind: AutomationKind, next: RuleState) {
    setLocal(kind, next);
    const { error } = await (supabase.from("automation_rules") as any).upsert(
      { org_id: orgId, kind, enabled: next.enabled, config: next.config },
      { onConflict: "org_id,kind" }
    );
    if (error) setError(error.message);
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {AUTOMATION_RULES.map((meta) => {
        const state = rules[meta.kind] ?? { enabled: false, config: {} };
        return (
          <Card key={meta.kind}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{meta.title}</div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{meta.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={state.enabled}
                  onClick={() => persist(meta.kind, { ...state, enabled: !state.enabled })}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                    state.enabled ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 transform rounded-full bg-card shadow-sm transition-transform",
                      state.enabled ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>

              {state.enabled && meta.config.length > 0 && (
                <div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-2">
                  {meta.config.map((f) =>
                    f.type === "assignee" ? (
                      <div key={f.key} className="space-y-1">
                        <Label>{f.label}</Label>
                        <Select
                          value={state.config[f.key] ?? ""}
                          onChange={(e) =>
                            persist(meta.kind, {
                              ...state,
                              config: { ...state.config, [f.key]: e.target.value },
                            })
                          }
                        >
                          <option value="">Whoever created it</option>
                          {members.map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                              {m.email}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ) : (
                      <div key={f.key} className="space-y-1">
                        <Label>{f.label}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={state.config[f.key] ?? ""}
                          placeholder="3"
                          onChange={(e) =>
                            setLocal(meta.kind, {
                              ...state,
                              config: { ...state.config, [f.key]: e.target.value },
                            })
                          }
                          onBlur={() => persist(meta.kind, state)}
                        />
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
