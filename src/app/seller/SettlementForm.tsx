"use client";

import { useActionState } from "react";
import { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Alert";
import { submitSettlement, type SettlementState } from "./actions";
import { money } from "@/lib/format";

export function SettlementForm({
  outstanding,
  allowBank,
  allowCrypto,
}: {
  outstanding: number;
  allowBank: boolean;
  allowCrypto: boolean;
}) {
  const [state, formAction] = useActionState<SettlementState, FormData>(submitSettlement, {});
  const [method, setMethod] = useState<string>(allowBank ? "BANK" : "CRYPTO");

  return (
    <form action={formAction} className="card space-y-3">
      <h2 className="font-serif text-base font-semibold">Settle commission</h2>
      <p className="text-sm text-tea-300">
        Submit proof of payment for your outstanding balance of{" "}
        <span className="font-semibold text-gold-400">{money(outstanding)}</span>. Your administrator
        will confirm it.
      </p>
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}

      <div>
        <label className="label">Payment method</label>
        <select
          name="method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="input max-w-xs"
        >
          {allowBank && <option value="BANK">Bank transfer</option>}
          {allowCrypto && <option value="CRYPTO">Crypto</option>}
        </select>
      </div>

      {method === "BANK" && (
        <div>
          <label className="label">Bank transfer receipt</label>
          <input name="receipt" type="file" accept="image/*,application/pdf" className="input" />
        </div>
      )}
      {method === "CRYPTO" && (
        <div>
          <label className="label">Transaction hash</label>
          <input name="txHash" className="input font-mono" placeholder="tx id" />
          <label className="label mt-2">Screenshot (optional)</label>
          <input name="receipt" type="file" accept="image/*,application/pdf" className="input" />
        </div>
      )}
      <div>
        <label className="label">Note (optional)</label>
        <input name="note" className="input" />
      </div>

      <SubmitButton className="btn-primary" pendingText="Submitting…">
        Submit settlement
      </SubmitButton>
    </form>
  );
}
