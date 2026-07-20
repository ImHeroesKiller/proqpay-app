"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/data/constants";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("siti.rahayu@msg-os.com");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(callbackUrl.startsWith("/") ? callbackUrl : "/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-5">
          <div className="text-center">
            <div className="text-2xl font-bold tracking-tight">
              Pro<span className="text-orange">Q</span>Pay
            </div>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              An MSG Technology Product
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Enterprise Payroll Operating System
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>
                Authorized operators only. Session expires after 8 hours of
                inactivity window.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    required
                    aria-invalid={!!error}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    aria-invalid={!!error}
                  />
                </div>
                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
              <div className="mt-6 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Demo accounts</p>
                <p className="mt-1">
                  Shared demo password is shown only in this sandbox environment.
                </p>
                <p className="mt-1 font-mono text-[11px] text-foreground/80">
                  Password: {DEMO_PASSWORD}
                </p>
                <ul className="mt-2 space-y-1">
                  {DEMO_ACCOUNTS.slice(0, 5).map((u) => (
                    <li key={u.email}>
                      <button
                        type="button"
                        className="text-left hover:text-orange focus-visible:text-orange"
                        onClick={() => setEmail(u.email)}
                      >
                        {u.email} · {u.role.replaceAll("_", " ")}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
          <p className="text-center text-[11px] text-muted-foreground">
            PT Mandiri Semesta Gemilang · Confidential operational system
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading sign-in…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
