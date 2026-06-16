"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Tags,
  Receipt,
  UserCog,
  LogOut,
  Menu,
  X,
  Flower2,
  Columns3,
  ListChecks,
  ShieldCheck,
  Building2,
  Target,
  MessagesSquare,
  CalendarDays,
  LifeBuoy,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { levelMeta } from "@/lib/levels";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Hidden from plain members (deal-money views). */
  privileged?: boolean;
  /** Minimum clearance required to see this entry (the feature's floor). */
  minLevel?: number;
};
type Membership = { org_id: string; role: string; org_name: string; level: number };

const baseItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/accounts", label: "Accounts", icon: Building2, minLevel: 4 },
  { href: "/leads", label: "Leads", icon: Target, minLevel: 5 },
  { href: "/interactions", label: "Interactions", icon: CalendarClock },
  { href: "/communications", label: "Communications", icon: MessagesSquare, minLevel: 3 },
  { href: "/tickets", label: "Tickets", icon: LifeBuoy, minLevel: 3 },
  { href: "/documents", label: "Documents", icon: FolderOpen, minLevel: 4 },
  { href: "/pipeline", label: "Pipeline", icon: Columns3, privileged: true },
  { href: "/deals", label: "Deals", icon: Receipt, privileged: true },
  { href: "/tasks", label: "Tasks & activities", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/team", label: "Team", icon: UserCog },
];

export function Nav({
  memberships,
  activeOrgId,
  activeRole,
  activeLevel,
  pendingCount,
  userEmail,
}: {
  memberships: Membership[];
  activeOrgId: string;
  activeRole: string;
  activeLevel: number;
  pendingCount: number;
  userEmail: string;
}) {
  const items = baseItems.filter(
    (i) =>
      (activeRole !== "member" || !i.privileged) &&
      activeLevel >= (i.minLevel ?? 1)
  );
  const clearance = levelMeta(activeLevel);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const NavLinks = () => (
    <nav className="flex-1 space-y-0.5">
      <div className="eyebrow px-3 pb-2 pt-1">Menu</div>
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "bg-primary/[0.08] text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gold" />
            )}
            <Icon
              className={cn(
                "h-[1.05rem] w-[1.05rem] transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground/70 group-hover:text-accent-foreground"
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const Brand = () => (
    <div className="flex items-center gap-2.5 px-1 pb-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Flower2 className="h-[1.15rem] w-[1.15rem]" />
      </div>
      <div className="leading-tight">
        <div className="font-display text-[1.15rem] font-semibold tracking-tight">
          Lupin
        </div>
        <div className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
          Relationship Almanac
        </div>
      </div>
    </div>
  );

  const Footer = () => (
    <div className="border-t border-border/70 pt-3 mt-3">
      <div className="flex items-center gap-2.5 px-2 pb-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[0.7rem] font-semibold uppercase text-accent-foreground">
          {(userEmail[0] ?? "?").toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="eyebrow">Signed in as</div>
          <div className="text-[0.8rem] font-medium truncate">{userEmail}</div>
        </div>
      </div>
      <div
        className="mx-2 mb-1 flex items-center gap-2 rounded-md border border-gold/30 bg-gold-soft/60 px-2.5 py-1.5"
        title={`Clearance level ${clearance.level} of 5 — you can see records up to "${clearance.tag}".`}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-[hsl(34_72%_30%)] dark:text-gold" />
        <span className="text-[0.7rem] font-semibold text-[hsl(34_72%_30%)] dark:text-gold">
          L{clearance.level} · {clearance.name}
        </span>
      </div>
      <button
        onClick={signOut}
        className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );

  const activeName =
    memberships.find((m) => m.org_id === activeOrgId)?.org_name ?? "Workspace";

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/70 bg-surface/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Flower2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Workspace</div>
            <div className="font-display font-semibold truncate leading-tight">{activeName}</div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen((s) => !s)}
          className="rounded-md p-2.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-0 h-full w-[min(20rem,calc(100vw-1rem))] bg-surface p-4 flex flex-col shadow-lg animate-fade-in"
          >
            <Brand />
            <div className="pb-3">
              <WorkspaceSwitcher
                memberships={memberships}
                activeOrgId={activeOrgId}
                pendingCount={pendingCount}
              />
            </div>
            <NavLinks />
            <Footer />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:border-r md:border-border/70 md:bg-surface md:p-4 md:overflow-y-auto">
        <Brand />
        <div className="pb-3">
          <WorkspaceSwitcher
            memberships={memberships}
            activeOrgId={activeOrgId}
            pendingCount={pendingCount}
          />
        </div>
        <NavLinks />
        <Footer />
      </aside>
    </>
  );
}
