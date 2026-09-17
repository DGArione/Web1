import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/Shell";
import { StatCard, StatusBadge, Table, EmptyState } from "@/components/ui";
import { money, dateTime } from "@/lib/format";

export default async function AdminOverview() {
  const [
    activeSellers,
    inactiveSellers,
    activeCustomers,
    pendingApps,
    pendingUsers,
    outstanding,
    recentNotifs,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "SELLER", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "SELLER", status: { in: ["INACTIVE", "RESTRICTED", "DISABLED"] } } }),
    prisma.user.count({ where: { role: "CUSTOMER", status: "ACTIVE" } }),
    prisma.sellerApplication.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.commissionEntry.aggregate({
      _sum: { commissionDue: true },
      where: { status: { in: ["PENDING", "DUE", "OVERDUE"] } },
    }),
    prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  return (
    <div>
      <PageHeader
        title="Platform overview"
        description="A snapshot of your private marketplace."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active sellers" value={activeSellers} />
        <StatCard label="Inactive / restricted" value={inactiveSellers} />
        <StatCard label="Active customers" value={activeCustomers} />
        <StatCard
          label="Outstanding commission"
          value={money(outstanding._sum.commissionDue ?? 0)}
          sub="owed by sellers"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Link href="/admin/applications" className="card transition-colors hover:border-gold-500/50">
          <p className="text-xs uppercase tracking-wide text-tea-400">Pending seller applications</p>
          <p className="mt-2 font-serif text-3xl font-semibold text-gold-400">{pendingApps}</p>
          <p className="mt-1 text-xs text-tea-400">Review requests →</p>
        </Link>
        <Link href="/admin/sellers" className="card transition-colors hover:border-gold-500/50">
          <p className="text-xs uppercase tracking-wide text-tea-400">Accounts awaiting approval</p>
          <p className="mt-2 font-serif text-3xl font-semibold text-gold-400">{pendingUsers}</p>
          <p className="mt-1 text-xs text-tea-400">Sellers & customers pending →</p>
        </Link>
      </div>

      <h2 className="mb-3 mt-8 font-serif text-lg font-semibold">Recent activity</h2>
      {recentNotifs.length === 0 ? (
        <EmptyState>No notifications yet.</EmptyState>
      ) : (
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Detail</th>
              <th className="px-4 py-3">When</th>
            </tr>
          }
        >
          {recentNotifs.map((n) => (
            <tr key={n.id}>
              <td className="px-4 py-3 font-medium text-tea-100">{n.title}</td>
              <td className="px-4 py-3 text-tea-300">{n.body}</td>
              <td className="px-4 py-3 text-tea-400">{dateTime(n.createdAt)}</td>
            </tr>
          ))}
        </Table>
      )}

      <p className="mt-6 text-xs text-tea-500">
        <StatusBadge status="ACTIVE" /> accounts can transact; other statuses restrict access.
      </p>
    </div>
  );
}
