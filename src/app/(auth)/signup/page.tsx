import Link from "next/link";
import { SignupForm } from "./signup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <div className="eyebrow mx-auto">Get started</div>
        <CardTitle className="text-[1.6rem]">Create your account</CardTitle>
        <CardDescription>Set up a workspace for your business in seconds.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
