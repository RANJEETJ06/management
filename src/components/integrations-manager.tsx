"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { INTEGRATION_PROVIDERS } from "@/lib/admin";
import type { IntegrationCategory } from "@/lib/types";

type IntState = { status: "connected" | "disconnected"; config: Record<string, string> };

export function IntegrationsManager({
  orgId,
  initial,
}: {
  orgId: string;
  initial: Record<string, IntState>;
}) {
  const supabase = createClient();
  const [state, setState] = useState<Record<string, IntState>>(initial);
  const [error, setError] = useState("");

  function get(provider: string): IntState {
    return state[provider] ?? { status: "disconnected", config: {} };
  }

  function setField(provider: string, key: string, value: string) {
    setState((s) => {
      const cur = s[provider] ?? { status: "disconnected", config: {} };
      return { ...s, [provider]: { ...cur, config: { ...cur.config, [key]: value } } };
    });
  }

  async function setStatus(
    provider: string,
    category: IntegrationCategory,
    status: "connected" | "disconnected"
  ) {
    const cur = get(provider);
    setState((s) => ({ ...s, [provider]: { ...cur, status } }));
    const { error } = await (supabase.from("integrations") as any).upsert(
      {
        org_id: orgId,
        provider,
        category,
        status,
        config: cur.config,
        connected_at: status === "connected" ? new Date().toISOString() : null,
      },
      { onConflict: "org_id,provider" }
    );
    if (error) setError(error.message);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-gold/30 bg-gold-soft/50 px-4 py-3 text-sm text-[hsl(34_72%_30%)] dark:text-gold">
        Connection scaffolding. Credentials are saved for your workspace; wiring each
        provider&rsquo;s live API call is the remaining step.
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {INTEGRATION_PROVIDERS.map((p) => {
        const s = get(p.provider);
        const connected = s.status === "connected";
        return (
          <Card key={p.provider}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.label}</span>
                    <Badge variant={connected ? "success" : "muted"}>
                      {connected ? "Connected" : "Not connected"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{p.description}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-2">
                {p.fields.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label>{f.label}</Label>
                    <Input
                      type={f.secret ? "password" : "text"}
                      value={s.config[f.key] ?? ""}
                      onChange={(e) => setField(p.provider, f.key, e.target.value)}
                      placeholder={f.secret ? "••••••••" : ""}
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-3 flex justify-end gap-2">
                {connected ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setStatus(p.provider, p.category, "connected")}
                    >
                      Save credentials
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setStatus(p.provider, p.category, "disconnected")}
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setStatus(p.provider, p.category, "connected")}>
                    Connect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
