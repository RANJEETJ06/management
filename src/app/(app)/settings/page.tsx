import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Workflow, Plug, ShieldCheck, UserCog, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const ITEMS = [
  {
    href: "/settings/automation",
    title: "Workflow automation",
    desc: "Auto-assign leads, follow-up tasks, and auto-advance deals.",
    icon: Workflow,
  },
  {
    href: "/settings/integrations",
    title: "Integrations",
    desc: "Email, WhatsApp, payments, accounting, ERP, and calendar.",
    icon: Plug,
  },
  {
    href: "/settings/roles",
    title: "Roles & permissions",
    desc: "How named roles map to clearance and what each can do.",
    icon: ShieldCheck,
  },
  {
    href: "/team",
    title: "Team",
    desc: "Invite members and set their clearance level.",
    icon: UserCog,
  },
];

export default async function SettingsPage() {
  const { role } = await requireOrg();
  if (role === "member") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Workspace administration." />
      <div className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          return (
            <Link key={it.href} href={it.href} className="group">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex items-start gap-3 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 font-medium">
                      {it.title}
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{it.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
