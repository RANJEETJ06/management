import Link from "next/link";
import { LoginForm } from "./login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <div className="eyebrow mx-auto">Welcome back</div>
        <CardTitle className="text-[1.6rem]">Sign in to your workspace</CardTitle>
        <CardDescription>Pick up your business diary right where you left off.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={searchParams.next} initialError={searchParams.error} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
