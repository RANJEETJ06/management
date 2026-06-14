import { NotebookPen, Users, CalendarClock, Receipt } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Editorial brand panel */}
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* atmospheric washes */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(40rem 40rem at 110% -10%, hsl(34 78% 46% / 0.35), transparent 55%), radial-gradient(36rem 36rem at -10% 110%, hsl(158 60% 40% / 0.45), transparent 55%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15 ring-1 ring-primary-foreground/20 backdrop-blur">
            <NotebookPen className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold tracking-tight">Data Manager</div>
            <div className="text-[0.65rem] uppercase tracking-[0.18em] text-primary-foreground/70">
              Business Almanac
            </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="font-display text-3xl font-light leading-snug tracking-tight xl:text-[2.6rem]">
            Every contact, conversation and deal — kept like a{" "}
            <span className="italic text-gold">well-bound ledger.</span>
          </p>
          <ul className="mt-9 space-y-4 text-sm text-primary-foreground/85">
            <Feature icon={Users} text="Suppliers, buyers & partners in one tidy place" />
            <Feature icon={CalendarClock} text="Log interactions and never miss a follow-up" />
            <Feature icon={Receipt} text="Track deals from first call to close" />
          </ul>
        </div>

        <div className="relative text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Data Manager · Your business diary in the cloud
        </div>
      </aside>

      {/* Form column */}
      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md animate-fade-up">{children}</div>
      </main>
    </div>
  );
}

function Feature({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
        <Icon className="h-4 w-4 text-gold" />
      </span>
      {text}
    </li>
  );
}
