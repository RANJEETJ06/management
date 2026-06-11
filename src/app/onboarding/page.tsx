import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PendingInvitation } from "@/lib/types";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { business?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1);

  if (((existing ?? []) as { org_id: string }[]).length > 0) {
    redirect("/dashboard");
  }

  // If a teammate invited them while they had no workspace, send them through
  // the explicit accept/decline flow before offering to create their own.
  const { data: pending } = await supabase.rpc("my_pending_invitations");
  if (((pending ?? []) as PendingInvitation[]).length > 0) {
    redirect("/invitations");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 px-4 py-10">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Set up your workspace</CardTitle>
          <CardDescription>
            Give your business a name. You can invite teammates later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm
            defaultName={searchParams.business || ""}
            userEmail={user.email || ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
