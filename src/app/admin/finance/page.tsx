import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/Shell";
import { StatCard, StatusBadge, Table, EmptyState } from "@/components/ui";
import { money, dateTime } from "@/lib/format";
import { emergencyPurge } from "../actions";

export default async function AdminFinance() {
  const [entries, totals] = await Promise.all([
    prisma.commissionEntry.findMany({
      include: { seller: { select: { name: true } }, order: { select: { total: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.commissionEntry.groupBy({
      by: ["status"],
      _sum: { commissionDue: true },
    }),
  ]);

  const sumFor = (status: string) =>
    totals.find((t) => t.status === status)?._sum.commissionDue ?? 0;
  const outstanding = sumFor("PENDING") + sumFor("DUE") + sumFor("OVERDUE");

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Commission settlement ledger. Retained even after customer-facing order data expires (§24)."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Outstanding" value={money(outstanding)} sub="pending + due + overdue" />
        <StatCard label="Paid" value={money(sumFor("PAID"))} />
        <StatCard label="Overdue" value={money(sumFor("OVERDUE"))} />
      </div>

      <h2 className="mb-3 mt-8 font-serif text-lg font-semibold">Commission ledger</h2>
      {entries.length === 0 ? (
        <EmptyState>No commission entries yet. They are created when payments are verified.</EmptyState>
      ) : (
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">Sale</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">Commission due</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          }
        >
          {entries.map((e) => (
            <tr key={e.id}>
              <td className="px-4 py-3 text-tea-100">{e.seller.name}</td>
              <td className="px-4 py-3 text-tea-300">{money(e.saleAmount)}</td>
              <td className="px-4 py-3 text-tea-300">{e.commissionPct}%</td>
              <td className="px-4 py-3 font-medium text-gold-400">{money(e.commissionDue)}</td>
              <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
              <td className="px-4 py-3 text-tea-400">{dateTime(e.createdAt)}</td>
            </tr>
          ))}
        </Table>
      )}

      {/* Emergency data management (§30) */}
      <h2 className="mb-3 mt-10 font-serif text-lg font-semibold text-red-300">
        Emergency data management
      </h2>
      <div className="card border-red-500/30">
        <p className="mb-4 text-sm text-tea-300">
          Purge temporary transaction data. Account records and the financial ledger are
          protected and cannot be removed here. Type <code className="text-red-300">PURGE</code> to confirm.
        </p>
        <form action={emergencyPurge} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Scope</label>
            <select name="scope" className="input min-w-[16rem]">
              <option value="expired_order_info">Clear expired order payment/collection info</option>
              <option value="notifications">Delete read notifications</option>
            </select>
          </div>
          <div>
            <label className="label">Confirmation</label>
            <input name="confirm" placeholder="PURGE" className="input w-32" />
          </div>
          <button type="submit" className="btn-danger">Execute purge</button>
        </form>
      </div>
    </div>
  );
}
