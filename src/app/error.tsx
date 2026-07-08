"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <p className="eyebrow mt-6">Something went wrong</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
        We hit a snag loading this page
      </h1>
      <p className="mt-3 max-w-sm text-muted-foreground">
        The error has been logged. Try again — if it keeps happening, sign out and
        back in.
      </p>
      <Button onClick={reset} className="mt-7">
        <RotateCcw className="h-4 w-4" /> Try again
      </Button>
    </div>
  );
}
