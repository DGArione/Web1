"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Alert";
import { applyAction, type ApplyState } from "./actions";

export default function ApplyPage() {
  const [state, formAction] = useActionState<ApplyState, FormData>(applyAction, {});

  if (state.success) {
    return (
      <AuthShell title="Request received">
        <Alert kind="success">
          Thank you. Your seller request has been submitted. If approved, an administrator
          will send you a private, one-time registration invitation.
        </Alert>
        <Link href="/" className="btn-ghost mt-6 w-full">
          Back to home
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Request seller access"
      subtitle="Public registration is not available. Submit a request for administrator review."
    >
      <form action={formAction} className="space-y-4">
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
          <label className="label" htmlFor="message">Message (optional)</label>
          <textarea id="message" name="message" rows={3} className="input" />
        </div>
        <SubmitButton className="btn-primary w-full" pendingText="Submitting…">
          Submit request
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-tea-300">
        Already a member?{" "}
        <Link href="/login" className="text-gold-400 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
