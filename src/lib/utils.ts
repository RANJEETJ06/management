import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | Date | null | undefined, fmt = "PP") {
  if (!value) return "";
  const d = typeof value === "string" ? parseISO(value) : value;
  return format(d, fmt);
}

export function relativeDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const d = typeof value === "string" ? parseISO(value) : value;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatCurrency(amount: number | null | undefined, currency = "INR") {
  if (amount == null) return "";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function siteUrl() {
  // Why: on Netlify, OAuth's redirectTo lands on Supabase's Site URL fallback
  // when this is undefined/malformed. Trust the browser's origin in client
  // contexts so a missing env var doesn't break sign-in.
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
