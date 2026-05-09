import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: members } = await supabase
    .from("members")
    .select("org_id, organizations(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (!members || members.length === 0) redirect("/onboarding");

  const orgName = (members[0] as any).organizations?.name ?? "Workspace";

  return (
    <div className="min-h-screen bg-muted/30">
      <Nav orgName={orgName} userEmail={user.email ?? ""} />
      <main className="md:pl-64">
        <div className="container max-w-6xl py-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}
