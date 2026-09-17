import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/Shell";
import { StatusBadge, Table, EmptyState } from "@/components/ui";
import { money } from "@/lib/format";
import { setAccountStatus } from "../actions";

export default async function AdminSellers() {
  const sellers = await prisma.user.findMany({
    where: { role: "SELLER" },
    include: { level: true, master: { select: { name: true } }, _count: { select: { reports: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <PageHeader
        title="Sellers"
        description="Every seller in the network, their level, master and status."
      />
      {sellers.length === 0 ? (
        <EmptyState>No sellers yet. Create a seller invitation to onboard one.</EmptyState>
      ) : (
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Master</th>
              <th className="px-4 py-3">Sales</th>
              <th className="px-4 py-3">Network</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          }
        >
          {sellers.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3">
                <div className="font-medium text-tea-100">{s.name}</div>
                <div className="text-xs text-tea-400">{s.email ?? s.phone}</div>
              </td>
              <td className="px-4 py-3 text-tea-300">{s.level?.name ?? "—"}</td>
              <td className="px-4 py-3 text-tea-300">{s.master?.name ?? "Administrator"}</td>
              <td className="px-4 py-3 text-tea-300">{money(s.totalSales)}</td>
              <td className="px-4 py-3 text-tea-300">{s._count.reports} reports</td>
              <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
              <td className="px-4 py-3">
                <form action={setAccountStatus} className="flex items-center gap-2">
                  <input type="hidden" name="userId" value={s.id} />
                  <select name="status" defaultValue={s.status} className="input max-w-[9rem] py-1">
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING">Pending</option>
                    <option value="RESTRICTED">Restricted</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                  <button type="submit" className="btn-ghost py-1 text-xs">Apply</button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
