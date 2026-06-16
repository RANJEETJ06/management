import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, Minus, UserCog } from "lucide-react";
import { NAMED_ROLES, PERMISSIONS } from "@/lib/admin";
import { LEVELS } from "@/lib/levels";

export const dynamic = "force-dynamic";

export default async function RolesSettingsPage() {
  const { role } = await requireOrg();
  if (role === "member") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & permissions"
        description="How Lupin's named roles map to the role + clearance model, and what each can do."
        action={
          <Button asChild variant="outline">
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" /> Settings
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permission matrix</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Basis</th>
                {PERMISSIONS.map((p) => (
                  <th key={p.key} className="py-2 pr-3 text-center font-medium">
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NAMED_ROLES.map((r) => (
                <tr key={r.name} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{r.name}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{r.basis}</td>
                  {PERMISSIONS.map((p) => {
                    const allowed = r.perms.includes(p.key);
                    return (
                      <td key={p.key} className="py-2 pr-3 text-center">
                        {allowed ? (
                          <Check className="mx-auto h-4 w-4 text-primary" />
                        ) : (
                          <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clearance ladder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Write access comes from the workspace <strong>role</strong> (owner/admin can edit;
            members are read-only). What a person can <strong>see</strong> comes from their{" "}
            <strong>clearance level</strong> — a record is hidden from anyone below its sensitivity.
          </p>
          <div className="divide-y rounded-md border">
            {[...LEVELS].reverse().map((l) => (
              <div key={l.level} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-medium">
                  L{l.level} · {l.name}
                </span>
                <span className="text-muted-foreground">{l.tag}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <Button asChild>
          <Link href="/team">
            <UserCog className="h-4 w-4" /> Assign roles & clearance on the Team page
          </Link>
        </Button>
      </div>
    </div>
  );
}
