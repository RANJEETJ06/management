import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateWorkspaceForm } from "./create-workspace-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewWorkspacePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 px-4 py-10">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>New workspace</CardTitle>
          <CardDescription>
            Create a separate workspace — useful if you run more than one
            business or want a distinct space for personal records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateWorkspaceForm />
        </CardContent>
      </Card>
    </div>
  );
}
