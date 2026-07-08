import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LEVELS } from "@/lib/levels";
import {
  Flower2,
  Users,
  CalendarClock,
  Receipt,
  ShieldCheck,
  Columns3,
  ListChecks,
  BarChart3,
  LifeBuoy,
  ArrowRight,
  ArrowUpRight,
  Building2,
  MessagesSquare,
  CheckCircle2,
} from "lucide-react";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <Hero />
        <FeatureChapters />
        <ClearanceLadder />
        <Workflow />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ---------------------------------- header --------------------------------- */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="container flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Flower2 className="h-[1.15rem] w-[1.15rem]" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[1.15rem] font-semibold tracking-tight">
              Lupin
            </span>
            <span className="block text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
              Relationship Almanac
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <a href="#chapters" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#clearance" className="transition-colors hover:text-foreground">
            Clearance
          </a>
          <a href="#workflow" className="transition-colors hover:text-foreground">
            How it works
          </a>
        </nav>

        <div className="flex items-center gap-2.5">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ----------------------------------- hero ---------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* atmospheric washes */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(46rem 46rem at 85% -20%, hsl(var(--gold) / 0.12), transparent 60%), radial-gradient(40rem 40rem at -10% 120%, hsl(var(--primary) / 0.08), transparent 55%)",
        }}
      />
      <div className="container relative max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:pb-28">
        <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
          <div className="max-w-xl">
            <p className="eyebrow animate-fade-up">A calmer CRM for real businesses</p>
            <h1
              className="mt-4 animate-fade-up font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]"
              style={{ animationDelay: "80ms" }}
            >
              Every contact, conversation and deal — kept like a{" "}
              <em className="text-gold">well-bound ledger.</em>
            </h1>
            <p
              className="mt-5 animate-fade-up text-lg leading-relaxed text-muted-foreground"
              style={{ animationDelay: "160ms" }}
            >
              Lupin keeps suppliers, buyers and partners in one tidy place — with
              follow-ups you never miss, deals tracked from first call to close, and
              five-tier clearance so the right eyes see the right data.
            </p>
            <div
              className="mt-8 flex flex-wrap items-center gap-3 animate-fade-up"
              style={{ animationDelay: "240ms" }}
            >
              <Button asChild size="lg">
                <Link href="/signup">
                  Start your workspace <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
            <p
              className="mt-5 animate-fade-up text-xs text-muted-foreground"
              style={{ animationDelay: "320ms" }}
            >
              Free to start · No credit card · Invite your whole team
            </p>
          </div>

          <HeroLedger />
        </div>
      </div>
    </section>
  );
}

/** A product-true collage: stat card, follow-ups and a pipeline bar, laid like
 *  loose pages from the almanac. Pure markup — no live data on the landing page. */
function HeroLedger() {
  return (
    <div
      aria-hidden
      className="relative mx-auto hidden w-full max-w-md animate-fade-up sm:block"
      style={{ animationDelay: "200ms" }}
    >
      {/* backdrop sheet */}
      <div className="absolute -left-4 top-8 h-[85%] w-full rotate-[-3deg] rounded-lg border border-border/70 bg-surface shadow-sm" />

      {/* follow-ups card */}
      <div className="relative rotate-[1.5deg] rounded-lg border border-border/70 bg-card p-5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="eyebrow">Follow-ups · this week</div>
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
        </div>
        <ul className="mt-4 space-y-3">
          {[
            { name: "Asha Traders", note: "Send revised quote for jute bags", due: "Tomorrow" },
            { name: "Meridian Exports", note: "Call re: October shipment", due: "Wed" },
            { name: "K. Patel & Sons", note: "Payment reminder — ₹1,84,000 due", due: "Fri" },
          ].map((f) => (
            <li key={f.name} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{f.name}</div>
                <div className="truncate text-xs text-muted-foreground">{f.note}</div>
              </div>
              <span className="shrink-0 rounded-full border border-gold/30 bg-gold-soft/70 px-2 py-0.5 text-[0.65rem] font-semibold text-[hsl(34_72%_30%)]">
                {f.due}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* stat card */}
      <div className="relative -mt-6 ml-auto w-56 rotate-[-2deg] rounded-lg border border-border/70 bg-card p-4 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="eyebrow">Open pipeline</div>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-soft text-[hsl(34_72%_30%)]">
            <Receipt className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="mt-1.5 font-display text-3xl font-semibold tracking-tight tnum">
          ₹42.6L
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
          <ArrowUpRight className="h-3.5 w-3.5" /> 12 deals in motion
        </div>
      </div>

      {/* clearance chip */}
      <div className="relative -mt-3 flex w-fit rotate-[1deg] items-center gap-2 rounded-md border border-gold/30 bg-gold-soft/70 px-3 py-2 shadow-sm">
        <ShieldCheck className="h-4 w-4 text-[hsl(34_72%_30%)]" />
        <span className="text-xs font-semibold text-[hsl(34_72%_30%)]">
          L5 · Director clearance
        </span>
      </div>
    </div>
  );
}

/* -------------------------------- feature grid ------------------------------ */

const CHAPTERS = [
  {
    icon: Users,
    title: "Contacts & accounts",
    body: "Suppliers, buyers and partners with tags, custom fields and full history — organised like a well-kept address book.",
  },
  {
    icon: CalendarClock,
    title: "Interactions & follow-ups",
    body: "Log every call, visit and meeting. Set a follow-up date and Lupin surfaces it before it slips.",
  },
  {
    icon: Columns3,
    title: "Leads & pipeline",
    body: "A weighted board from first enquiry to close, with forecasts that reflect how likely each stage really is.",
  },
  {
    icon: Receipt,
    title: "Deals & payments",
    body: "Track buy and sell deals, amounts due and paid — and see outstanding balances at a glance.",
  },
  {
    icon: ListChecks,
    title: "Tasks & calendar",
    body: "Everything due in one list and one calendar, tied to the contact or deal it belongs to.",
  },
  {
    icon: MessagesSquare,
    title: "Communications",
    body: "Email templates and logged conversations, so anyone can pick up a thread without asking around.",
  },
  {
    icon: LifeBuoy,
    title: "Tickets & knowledge base",
    body: "Support issues with owners and statuses, plus internal articles your team can actually find.",
  },
  {
    icon: BarChart3,
    title: "Reports & exports",
    body: "Sales vs purchases, pipeline by stage, CSV exports of everything — your numbers, always in reach.",
  },
];

function FeatureChapters() {
  return (
    <section id="chapters" className="border-t border-border/70 bg-surface/60">
      <div className="container max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow">The chapters</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            One almanac for the whole business
          </h2>
          <div className="accent-rule mt-4" />
          <p className="mt-4 text-muted-foreground">
            Not a wall of dashboards — a small set of well-made pages that cover how a
            trading business actually runs.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CHAPTERS.map((c) => (
            <div
              key={c.title}
              className="group rounded-lg border border-border/70 bg-card p-5 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <c.icon className="h-4 w-4" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
                {c.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ clearance ladder ---------------------------- */

const LEVEL_NOTES: Record<number, string> = {
  1: "Sees only records tagged “open to all” — safe for new hires from day one.",
  2: "Adds senior-level records: pricing notes, key contacts, day-to-day detail.",
  3: "Unlocks pipeline, communications and support tickets for team leads.",
  4: "Managers see accounts and documents across the whole workspace.",
  5: "Directors see everything — leads, forecasts and the full ledger.",
};

function ClearanceLadder() {
  return (
    <section id="clearance" className="relative overflow-hidden bg-primary text-primary-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(42rem 42rem at 110% -10%, hsl(34 78% 46% / 0.28), transparent 55%), radial-gradient(36rem 36rem at -10% 110%, hsl(158 60% 40% / 0.4), transparent 55%)",
        }}
      />
      <div className="container relative max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="max-w-md">
            <p className="eyebrow text-primary-foreground/60">The difference</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Five-tier clearance,{" "}
              <em className="text-gold">built in — not bolted on.</em>
            </h2>
            <p className="mt-5 leading-relaxed text-primary-foreground/80">
              Every record in Lupin carries a sensitivity level, enforced in the
              database itself. Junior staff work freely without seeing margins or
              director-only leads; the boardroom sees everything. No separate
              spreadsheets, no “please don’t open that tab.”
            </p>
            <ul className="mt-7 space-y-3 text-sm text-primary-foreground/85">
              {[
                "Enforced by row-level security, not just hidden menus",
                "Set a record’s level in one click — never above your own",
                "Whole features gate cleanly: leads, accounts, documents",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <ol className="space-y-3">
            {[...LEVELS].reverse().map((l) => (
              <li
                key={l.level}
                className="flex items-start gap-4 rounded-lg border border-primary-foreground/15 bg-primary-foreground/[0.06] p-4 backdrop-blur-sm"
                style={{ marginLeft: `${(5 - l.level) * 0.9}rem` }}
              >
                <span
                  className={
                    l.level === 5
                      ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold font-display text-sm font-bold text-gold-foreground"
                      : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 font-display text-sm font-bold"
                  }
                >
                  L{l.level}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2.5">
                    <span className="font-display text-lg font-semibold tracking-tight">
                      {l.name}
                    </span>
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary-foreground/55">
                      {l.tag}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-primary-foreground/75">
                    {LEVEL_NOTES[l.level]}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- workflow --------------------------------- */

const STEPS = [
  {
    icon: Building2,
    title: "Open your workspace",
    body: "Sign up, name your organisation, and your ledger is ready. Multiple workspaces welcome — switch anytime.",
  },
  {
    icon: ShieldCheck,
    title: "Invite with clearance",
    body: "Bring the team in by email and hand each person a level, 1 to 5. Access follows the level, automatically.",
  },
  {
    icon: CalendarClock,
    title: "Keep the record",
    body: "Log contacts, calls and deals as they happen. Lupin turns them into follow-ups, forecasts and reports.",
  },
];

function Workflow() {
  return (
    <section id="workflow" className="border-t border-border/70">
      <div className="container max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Running in an afternoon
          </h2>
          <div className="accent-rule mx-auto mt-4" />
        </div>

        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-lg border border-border/70 bg-card p-6 shadow-xs">
              <span className="absolute -top-3.5 left-6 flex h-7 w-7 items-center justify-center rounded-full bg-gold font-display text-xs font-bold text-gold-foreground shadow-sm">
                {i + 1}
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <s.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------- closing CTA -------------------------------- */

function ClosingCta() {
  return (
    <section className="border-t border-border/70 bg-surface/60">
      <div className="container max-w-6xl px-4 py-20 text-center sm:px-6">
        <Flower2 className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mx-auto mt-5 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Start keeping a <em className="text-gold">better ledger</em> today
        </h2>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Your first workspace is free. Bring the team when you’re ready.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">
              Create your workspace <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- footer ---------------------------------- */

function SiteFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="container flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <Flower2 className="h-4 w-4 text-primary" />
          <span>
            © {new Date().getFullYear()} Lupin · A calmer CRM for real businesses
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#chapters" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#clearance" className="transition-colors hover:text-foreground">
            Clearance
          </a>
          <Link href="/login" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
