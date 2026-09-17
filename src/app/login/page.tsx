"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Alert";
import { loginAction, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <AuthShell title="Member login" subtitle="Access your private account.">
      <form action={formAction} className="space-y-4">
        {state.error && <Alert kind="error">{state.error}</Alert>}
        <div>
          <label className="label" htmlFor="identifier">
            Email or phone
          </label>
          <input id="identifier" name="identifier" className="input" autoComplete="username" required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            autoComplete="current-password"
            required
          />
        </div>
        <SubmitButton className="btn-primary w-full" pendingText="Signing in…">
          Sign in
        </SubmitButton>
      </form>

      <div className="mt-6 space-y-2 text-center text-sm text-tea-300">
        <p>
          Not a member yet?{" "}
          <Link href="/apply" className="text-gold-400 hover:underline">
            Request seller access
          </Link>
        </p>
        <p className="text-xs text-tea-400">
          Customers join via an invitation link from their seller.
        </p>
      </div>
    </AuthShell>
  );
}
