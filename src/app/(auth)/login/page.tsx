"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Mail, Lock, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-accent text-white shadow-lg">
          <Activity className="size-5" strokeWidth={2.5} />
        </span>
        <h1 className="text-xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">
          Sign in to continue tracking your habits
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-muted">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-line bg-surface2 py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-faint focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-muted">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-line bg-surface2 py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-faint focus:border-accent"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-missed/10 px-3 py-2 text-xs text-missed">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Signing in…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <LogIn className="size-4" /> Sign in
            </span>
          )}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-accent hover:underline"
        >
          Create one
        </Link>
      </p>
    </Card>
  );
}
