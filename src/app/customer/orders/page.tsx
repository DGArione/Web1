import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/Shell";
import { StatusBadge, EmptyState } from "@/components/ui";
import { money, dateTime, relativeExpiry } from "@/lib/format";
import { getAllSettings, SETTING_KEYS as K } from "@/lib/settings";
import { PaymentProofForm } from "../PaymentProofForm";

export default async function CustomerOrders() {
  const me = await requireRole("CUSTOMER");
  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: me.id },
      include: { items: true, payment: true, seller: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getAllSettings(),
  ]);

  const method = settings[K.PAYMENT_METHOD];
  const allowBank = method === "BANK" || method === "BOTH";
  const allowCrypto = method === "CRYPTO" || method === "BOTH";

  return (
    <div>
      <PageHeader
        title="My orders"
        description="Track your orders. Sensitive details are shown temporarily and expire for privacy."
      />
      {orders.length === 0 ? (
        <EmptyState>You haven&apos;t placed any orders yet. Visit the shop to order.</EmptyState>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const expiry = relativeExpiry(o.expiresAt);
            const infoVisible = !o.expiresAt || !expiry.expired;
            return (
              <div key={o.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-tea-100">
                      Order <span className="font-mono text-xs text-tea-400">{o.id.slice(0, 8)}</span>
                    </p>
                    <p className="text-sm text-tea-300">{o.seller.name} · {money(o.total)} · {dateTime(o.createdAt)}</p>
                    <ul className="mt-2 text-xs text-tea-400">
                      {o.items.map((it) => (
                        <li key={it.id}>{it.quantity}× {it.name} @ {money(it.price)}</li>
                      ))}
                    </ul>
                  </div>
                  <StatusBadge status={o.status} />
                </div>

                {/* Payment instructions (temporary) */}
                {o.status === "AWAITING_PAYMENT" && (
                  <div className="mt-4 border-t border-tea-800/60 pt-4">
                    <div className="rounded-md bg-tea-950/60 p-3 text-sm">
                      <p className="mb-1 font-semibold text-tea-100">Payment instructions</p>
                      {o.paymentInfo && <p className="text-tea-300">{o.paymentInfo}</p>}
                      {allowBank && (
                        <div className="mt-2 text-tea-300">
                          <p className="font-medium text-tea-200">Bank transfer</p>
                          <p>{settings[K.BANK_NAME]} — {settings[K.BANK_ACCOUNT_NAME]}</p>
                          <p>A/C {settings[K.BANK_ACCOUNT_NUMBER]} · {settings[K.BANK_BRANCH]}</p>
                          {settings[K.BANK_INSTRUCTIONS] && <p className="text-xs text-tea-400">{settings[K.BANK_INSTRUCTIONS]}</p>}
                        </div>
                      )}
                      {allowCrypto && (
                        <div className="mt-2 text-tea-300">
                          <p className="font-medium text-tea-200">Crypto</p>
                          <p>{settings[K.CRYPTO_CURRENCY]} on {settings[K.CRYPTO_NETWORK]}</p>
                          <p className="break-all font-mono text-xs">{settings[K.CRYPTO_ADDRESS]}</p>
                          {settings[K.CRYPTO_INSTRUCTIONS] && <p className="text-xs text-tea-400">{settings[K.CRYPTO_INSTRUCTIONS]}</p>}
                        </div>
                      )}
                    </div>
                    <PaymentProofForm orderId={o.id} allowBank={allowBank} allowCrypto={allowCrypto} />
                  </div>
                )}

                {/* Proof submitted, awaiting verification */}
                {o.status === "PROOF_SUBMITTED" && (
                  <p className="mt-4 border-t border-tea-800/60 pt-4 text-sm text-tea-300">
                    Payment proof submitted. Awaiting seller verification.
                  </p>
                )}

                {/* Collection info (temporary) */}
                {o.status === "READY_FOR_COLLECTION" && (
                  <div className="mt-4 border-t border-tea-800/60 pt-4">
                    {infoVisible ? (
                      <div className="rounded-md bg-tea-950/60 p-3 text-sm">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="font-semibold text-tea-100">Collection information</p>
                          <span className="badge bg-gold-500/20 text-gold-400">{expiry.label}</span>
                        </div>
                        <p className="text-tea-300">{o.collectionInfo || "Contact your seller for collection details."}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-tea-500">
                        This information has expired and is no longer visible.
                      </p>
                    )}
                  </div>
                )}

                {o.status === "COMPLETED" && (
                  <p className="mt-4 border-t border-tea-800/60 pt-4 text-sm text-tea-400">
                    {infoVisible
                      ? "Order completed."
                      : "Order completed. Transaction details have expired for privacy."}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
