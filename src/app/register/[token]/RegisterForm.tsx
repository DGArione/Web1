"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Alert";
import { registerAction, type RegisterState } from "./actions";

export function RegisterForm({
  token,
  isSeller,
}: {
  token: string;
  isSeller: boolean;
}) {
  const [state, formAction] = useActionState<RegisterState, FormData>(registerAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && <Alert kind="error">{state.error}</Alert>}
      <div>
        <label className="label" htmlFor="name">Full name</label>
        <input id="name" name="name" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="phone">Phone (optional)</label>
        <input id="phone" name="phone" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" minLength={8} required />
        <p className="mt-1 text-xs text-tea-400">At least 8 characters.</p>
      </div>
      {isSeller && (
        <div>
          <label className="label" htmlFor="recovery">Recovery credential</label>
          <input id="recovery" name="recovery" type="password" className="input" minLength={6} required />
          <p className="mt-1 text-xs text-tea-400">
            A separate secret used to reactivate your account if it becomes inactive.
          </p>
        </div>
      )}
      <SubmitButton className="btn-primary w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
