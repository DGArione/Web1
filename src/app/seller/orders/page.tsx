import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/Shell";
import { StatusBadge, EmptyState } from "@/components/ui";
import { money, dateTime } from "@/lib/format";
import { provideOrderInfo, verifyPayment, completeOrder } from "../actions";

export default async function SellerOrders() {
  const me = await requireRole("SELLER");
  const orders = await prisma.order.findMany({
    where: { sellerId: me.id },
    include: {
      customer: { select: { name: true, email: true } },
      items: true,
      payment: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <PageHeader title="Orders" description="Review orders, provide payment details, verify proofs and release collection info." />
      {orders.length === 0 ? (
        <EmptyState>No orders yet.</EmptyState>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-tea-100">
                    Order <span className="font-mono text-xs text-tea-400">{o.id.slice(0, 8)}</span>
                  </p>
                  <p className="text-sm text-tea-300">
                    {o.customer.name} · {money(o.total)} · {dateTime(o.createdAt)}
                  </p>
                  <ul className="mt-2 text-xs text-tea-400">
                    {o.items.map((it) => (
                      <li key={it.id}>{it.quantity}× {it.name} @ {money(it.price)}</li>
                    ))}
                  </ul>
                </div>
                <StatusBadge status={o.status} />
              </div>

              {/* Step: provide payment info */}
              {o.status === "CREATED" && (
                <form action={provideOrderInfo} className="mt-4 border-t border-tea-800/60 pt-4">
                  <input type="hidden" name="orderId" value={o.id} />
                  <label className="label">Payment instructions for the customer</label>
                  <textarea
                    name="paymentInfo"
                    rows={2}
                    className="input"
                    placeholder="e.g. Transfer to the platform bank account and use this order ID as reference."
                    required
                  />
                  <button type="submit" className="btn-primary mt-3">Send payment info</button>
                </form>
              )}

              {/* Step: awaiting the customer's payment proof */}
              {o.status === "AWAITING_PAYMENT" && (
                <p className="mt-4 border-t border-tea-800/60 pt-4 text-sm text-tea-400">
                  Waiting for the customer to upload payment proof.
                </p>
              )}

              {/* Step: verify submitted proof */}
              {o.status === "PROOF_SUBMITTED" && o.payment && (
                <div className="mt-4 border-t border-tea-800/60 pt-4">
                  <p className="mb-2 text-sm text-tea-300">
                    Payment proof submitted via <span className="text-tea-100">{o.payment.method}</span>.
                    {o.payment.txHash && <> Tx: <span className="font-mono text-xs">{o.payment.txHash}</span></>}
                  </p>
                  {o.payment.receiptUrl && (
                    <a href={o.payment.receiptUrl} target="_blank" className="text-xs text-gold-400 hover:underline">
                      View uploaded receipt →
                    </a>
                  )}
                  {o.payment.note && <p className="mt-1 text-xs text-tea-400">Note: {o.payment.note}</p>}

                  <form action={verifyPayment} className="mt-3 space-y-2">
                    <input type="hidden" name="orderId" value={o.id} />
                    <label className="label">Collection information (revealed on verify)</label>
                    <textarea
                      name="collectionInfo"
                      rows={2}
                      className="input"
                      placeholder="e.g. Collect from the Colombo pickup point, 2–5pm, ask for order reference."
                    />
                    <div className="flex gap-2">
                      <button type="submit" name="decision" value="verify" className="btn-primary">
                        Verify payment & release
                      </button>
                      <button type="submit" name="decision" value="reject" className="btn-ghost text-red-300">
                        Reject proof
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Step: ready for collection */}
              {o.status === "READY_FOR_COLLECTION" && (
                <form action={completeOrder} className="mt-4 border-t border-tea-800/60 pt-4">
                  <input type="hidden" name="orderId" value={o.id} />
                  <p className="mb-2 text-sm text-tea-300">Payment verified. Awaiting collection.</p>
                  <button type="submit" className="btn-gold">Mark completed</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
