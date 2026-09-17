"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert } from "@/components/Alert";
import { placeOrder, type OrderState } from "./actions";
import { money } from "@/lib/format";

export function OrderForm({
  productId,
  name,
  price,
  stock,
}: {
  productId: string;
  name: string;
  price: number;
  stock: number;
}) {
  const [state, formAction] = useActionState<OrderState, FormData>(placeOrder, {});

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="productId" value={productId} />
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      <div className="flex items-center gap-2">
        <label className="text-xs text-tea-400" htmlFor={`qty-${productId}`}>Qty</label>
        <input
          id={`qty-${productId}`}
          name="quantity"
          type="number"
          min={1}
          max={stock}
          defaultValue={1}
          className="input w-20 py-1"
        />
        <SubmitButton className="btn-primary py-1.5 text-sm" pendingText="Placing…">
          Order · {money(price)}
        </SubmitButton>
      </div>
    </form>
  );
}
