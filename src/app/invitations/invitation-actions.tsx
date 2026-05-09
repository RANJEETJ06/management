"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function InvitationActions({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState("");

  async function call(action: "accept" | "decline") {
    setError("");
    setBusy(action);
    try {
      const res = await fetch(`/api/invitations/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Something went wrong.");
        return;
      }
      if (action === "accept") {
        router.push("/dashboard");
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message ?? "Network error.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        onClick={() => call("accept")}
        disabled={busy !== null}
        className="bg-emerald-600 hover:bg-emerald-700"
      >
        <Check className="h-4 w-4" /> {busy === "accept" ? "Joining…" : "Accept"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => call("decline")}
        disabled={busy !== null}
      >
        <X className="h-4 w-4" /> {busy === "decline" ? "…" : "Decline"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
