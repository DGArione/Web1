import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/Shell";
import { StatCard, StatusBadge, Table, EmptyState } from "@/components/ui";
import { money, dateTime } from "@/lib/format";
import { getAllSettings, SETTING_KEYS as K } from "@/lib/settings";
import { SettlementForm } from "../SettlementForm";

export default async function SellerFinance() {
  const me = await requireRole("SELLER");
  const [entries, totals, settlements, settings] = await Promise.all([
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
    prisma.settlement.findMany({
      where: { sellerId: me.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getAllSettings(),
  ]);
  const sumFor = (s: string) => totals.find((t) => t.status === s)?._sum.commissionDue ?? 0;
  const outstanding = Math.round((sumFor("PENDING") + sumFor("DUE") + sumFor("OVERDUE")) * 100) / 100;
  const method = settings[K.PAYMENT_METHOD];
  const allowBank = method === "BANK" || method === "BOTH";
  const allowCrypto = method === "CRYPTO" || method === "BOTH";
  const hasPending = settlements.some((s) => s.status === "SUBMITTED");

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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {outstanding > 0 && !hasPending ? (
          <SettlementForm outstanding={outstanding} allowBank={allowBank} allowCrypto={allowCrypto} />
        ) : (
          <div className="card text-sm text-tea-300">
            {hasPending
              ? "You have a settlement awaiting administrator confirmation."
              : "You have no outstanding commission. Nothing to settle right now."}
          </div>
        )}

        <div className="card">
          <h2 className="mb-3 font-serif text-base font-semibold">Settlement history</h2>
          {settlements.length === 0 ? (
            <p className="text-sm text-tea-400">No settlements submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {settlements.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-tea-200">{money(s.amount)} · {s.method}</span>
                  <span className="flex items-center gap-2 text-tea-400">
                    {dateTime(s.createdAt)} <StatusBadge status={s.status} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
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
