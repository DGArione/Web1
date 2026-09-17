import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/Shell";
import { StatCard, EmptyState } from "@/components/ui";
import { money } from "@/lib/format";

export default async function SellerOverview() {
  const me = await requireRole("SELLER");
  const [level, customers, pendingCustomers, openOrders, products, outstanding] = await Promise.all([
    me.levelId ? prisma.sellerLevel.findUnique({ where: { id: me.levelId } }) : null,
    prisma.user.count({ where: { masterId: me.id, role: "CUSTOMER", status: "ACTIVE" } }),
    prisma.user.count({ where: { masterId: me.id, role: "CUSTOMER", status: "PENDING" } }),
    prisma.order.count({ where: { sellerId: me.id, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    prisma.product.count({ where: { sellerId: me.id } }),
    prisma.commissionEntry.aggregate({
      _sum: { commissionDue: true },
      where: { sellerId: me.id, status: { in: ["PENDING", "DUE", "OVERDUE"] } },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title={`Welcome, ${me.name}`}
        description={level ? `${level.name} level · ${me.points} points` : "Seller dashboard"}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total sales" value={money(me.totalSales)} />
        <StatCard label="Active customers" value={customers} sub={`${pendingCustomers} pending`} />
        <StatCard label="Open orders" value={openOrders} />
        <StatCard label="Commission owed" value={money(outstanding._sum.commissionDue ?? 0)} sub="to platform" />
      </div>

      {products === 0 && (
        <div className="mt-6">
          <EmptyState>
            You have no products yet. Add products so your customers can place orders.
          </EmptyState>
        </div>
      )}

      {level && (
        <div className="card mt-6">
          <h2 className="mb-2 font-serif text-lg font-semibold">Your level: {level.name}</h2>
          <div className="grid gap-2 text-sm text-tea-300 sm:grid-cols-2">
            <p>Platform commission: <span className="text-tea-100">{level.commissionPct}%</span> (price brackets may override)</p>
            <p>Next-level sales target: <span className="text-tea-100">{money(level.minSales)}</span></p>
            <p>Recruit sellers: <span className="text-tea-100">{level.canRecruit ? "Yes" : "No"}</span></p>
            <p>Credit: <span className="text-tea-100">{level.creditAllowed ? `${level.creditDays} days` : "Not available"}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
