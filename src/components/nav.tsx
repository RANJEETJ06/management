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
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const items: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/interactions", label: "Interactions", icon: CalendarClock },
  { href: "/deals", label: "Deals", icon: Receipt },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/team", label: "Team", icon: UserCog },
];

export function Nav({ orgName, userEmail }: { orgName: string; userEmail: string }) {
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
    <nav className="flex-1 space-y-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const Footer = () => (
    <div className="border-t pt-3 mt-3">
      <div className="px-3 pb-2">
        <div className="text-xs text-muted-foreground">Signed in as</div>
        <div className="text-sm font-medium truncate">{userEmail}</div>
      </div>
      <button
        onClick={signOut}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="font-semibold truncate">{orgName}</div>
        <button
          onClick={() => setMobileOpen((s) => !s)}
          className="rounded-md p-2 hover:bg-accent"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMobileOpen(false)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-0 h-full w-72 bg-background p-4 flex flex-col"
          >
            <div className="px-3 pb-4 font-semibold">{orgName}</div>
            <NavLinks />
            <Footer />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:border-r md:bg-background md:p-4">
        <div className="px-3 pb-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Workspace</div>
          <div className="font-semibold truncate">{orgName}</div>
        </div>
        <NavLinks />
        <Footer />
      </aside>
    </>
  );
}
