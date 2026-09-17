import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/Shell";
import { StatCard, StatusBadge, Table, EmptyState } from "@/components/ui";
import { money, dateTime } from "@/lib/format";

export default async function SellerFinance() {
  const me = await requireRole("SELLER");
  const [entries, totals] = await Promise.all([
    prisma.commissionEntry.findMany({
      where: { sellerId: me.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.commissionEntry.groupBy({
      by: ["status"],
      where: { sellerId: me.id },
      _sum: { commissionDue: true },
    }),
  ]);
  const sumFor = (s: string) => totals.find((t) => t.status === s)?._sum.commissionDue ?? 0;
  const outstanding = sumFor("PENDING") + sumFor("DUE") + sumFor("OVERDUE");

  return (
    <div>
      <PageHeader
        title="Commission & settlement"
        description="Platform commission owed on your completed sales."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Owed to platform" value={money(outstanding)} />
        <StatCard label="Paid" value={money(sumFor("PAID"))} />
        <StatCard label="Overdue" value={money(sumFor("OVERDUE"))} />
      </div>

      <div className="card mt-6 text-sm text-tea-300">
        Settlement is handled with your administrator. When a payment is due, submit your proof
        to the administrator and they will confirm it. Your sale earnings (sale amount minus
        commission) are yours to keep.
      </div>

      <h2 className="mb-3 mt-8 font-serif text-lg font-semibold">Ledger</h2>
      {entries.length === 0 ? (
        <EmptyState>No commission yet. Entries appear when you verify a customer&apos;s payment.</EmptyState>
      ) : (
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Sale</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">You keep</th>
              <th className="px-4 py-3">Due date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          }
        >
          {entries.map((e) => (
            <tr key={e.id}>
              <td className="px-4 py-3 font-mono text-xs text-tea-400">{e.orderId.slice(0, 8)}</td>
              <td className="px-4 py-3 text-tea-300">{money(e.saleAmount)}</td>
              <td className="px-4 py-3 text-tea-300">{e.commissionPct}%</td>
              <td className="px-4 py-3 text-gold-400">{money(e.commissionDue)}</td>
              <td className="px-4 py-3 text-tea-100">{money(e.saleAmount - e.commissionDue)}</td>
              <td className="px-4 py-3 text-tea-400">{dateTime(e.dueDate)}</td>
              <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
