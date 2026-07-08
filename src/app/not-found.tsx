import Link from "next/link";
import { Flower2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Flower2 className="h-6 w-6" />
      </span>
      <p className="eyebrow mt-6">Page not found</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
        This page isn&rsquo;t in the ledger
      </h1>
      <p className="mt-3 max-w-sm text-muted-foreground">
        The page you&rsquo;re looking for was moved, renamed, or never existed.
      </p>
      <Button asChild className="mt-7">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </Button>
    </div>
  );
}
