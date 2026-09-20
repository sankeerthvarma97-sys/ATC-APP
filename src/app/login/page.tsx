"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Plane, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const demoAccounts = [
  { label: "ATC", email: "atc@aocc.test" },
  { label: "Admin", email: "admin@aocc.test" },
  { label: "Ground", email: "ground@aocc.test" },
  { label: "Viewer", email: "viewer@aocc.test" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("atc@aocc.test");
  const [password, setPassword] = useState("AoccDemo!2026");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid AOCC credentials.");
        return;
      }

      router.push("/");
      router.refresh();
    });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 grid h-12 w-12 place-items-center rounded-md bg-primary text-primary-foreground">
            <Plane className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Airport Operations Control Center</CardTitle>
          <CardDescription>
            Educational real-time airport operations simulation. Not certified aviation software.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={submit}>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Email" />
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} aria-label="Password" />
            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                {error}
              </div>
            )}
            <Button className="w-full" type="submit" disabled={isPending}>
              <ShieldCheck className="h-4 w-4" />
              Enter AOCC
            </Button>
          </form>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((account) => (
              <Button key={account.email} variant="outline" size="sm" onClick={() => setEmail(account.email)}>
                {account.label}
              </Button>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            All demo accounts use password <span className="font-mono">AoccDemo!2026</span>.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
