"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Alert";
import { submitPaymentProof, type OrderState } from "./actions";

export function PaymentProofForm({
  orderId,
  allowBank,
  allowCrypto,
}: {
  orderId: string;
  allowBank: boolean;
  allowCrypto: boolean;
}) {
  const [state, formAction] = useActionState<OrderState, FormData>(submitPaymentProof, {});
  const [method, setMethod] = useState<string>(allowBank ? "BANK" : "CRYPTO");

  return (
    <form action={formAction} className="mt-4 space-y-3 border-t border-tea-800/60 pt-4">
      <input type="hidden" name="orderId" value={orderId} />
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
          <label className="label">Bank transfer receipt (image or PDF)</label>
          <input name="receipt" type="file" accept="image/*,application/pdf" className="input" />
        </div>
      )}

      {method === "CRYPTO" && (
        <div>
          <label className="label">Transaction hash</label>
          <input name="txHash" className="input font-mono" placeholder="0x… / tx id" />
          <label className="label mt-2">Screenshot (optional)</label>
          <input name="receipt" type="file" accept="image/*,application/pdf" className="input" />
        </div>
      )}

      <div>
        <label className="label">Note (optional)</label>
        <input name="note" className="input" placeholder="Any reference or detail" />
      </div>

      <SubmitButton className="btn-primary" pendingText="Submitting…">
        Submit payment proof
      </SubmitButton>
    </form>
  );
}
