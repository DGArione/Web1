import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/Shell";
import { EmptyState } from "@/components/ui";
import { Alert } from "@/components/Alert";
import { money } from "@/lib/format";
import { OrderForm } from "./OrderForm";

export default async function CustomerShop() {
  const me = await requireRole("CUSTOMER");

  const seller = me.masterId
    ? await prisma.user.findUnique({ where: { id: me.masterId }, select: { name: true, status: true } })
    : null;

  const products = me.masterId
    ? await prisma.product.findMany({
        where: { sellerId: me.masterId, active: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div>
      <PageHeader
        title={seller ? `${seller.name}'s shop` : "Shop"}
        description="Browse and order the products available to you."
      />

      {me.status === "PENDING" && (
        <div className="mb-6">
          <Alert kind="info">
            Your account is awaiting approval from your seller. You&apos;ll be able to order once approved.
          </Alert>
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState>No products are available from your seller yet.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between">
                <h3 className="font-serif text-base font-semibold text-tea-50">{p.name}</h3>
                <span className="badge bg-tea-700/50 text-tea-200">{money(p.price)}</span>
              </div>
              <p className="mt-1 text-xs text-tea-400">Code {p.code} · {p.stock} in stock</p>
              {p.description && <p className="mt-2 text-sm text-tea-300">{p.description}</p>}
              {me.status === "ACTIVE" && p.stock > 0 ? (
                <OrderForm productId={p.id} name={p.name} price={p.price} stock={p.stock} />
              ) : (
                <p className="mt-3 text-xs text-tea-500">
                  {p.stock <= 0 ? "Out of stock" : "Ordering available once approved"}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
