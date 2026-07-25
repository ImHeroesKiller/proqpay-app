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
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 gradient-navy opacity-95" />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative w-full max-w-md space-y-5">
        <div className="text-center text-white">
          <div className="font-display text-3xl font-bold tracking-tight">
            Pro<span className="text-orange">Q</span>Pay
          </div>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
            Enterprise Payroll Operating System
          </p>
        </div>
        <Card className="border-white/10 shadow-lift">
          <CardHeader>
            <CardTitle className="font-display">Sign in</CardTitle>
            <CardDescription>
              Secure access to payroll service operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                  className="rounded-2xl"
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
                  className="rounded-2xl"
                />
              </div>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Demo accounts</p>
              <p className="mt-1">Password for all: {DEMO_PASSWORD}</p>
              <ul className="mt-2 space-y-1">
                {DEMO_ACCOUNTS.slice(0, 4).map((u) => (
                  <li key={u.email}>
                    <button
                      type="button"
                      className="text-left hover:text-orange"
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
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-navy text-white">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
