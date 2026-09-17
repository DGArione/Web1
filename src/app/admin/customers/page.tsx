import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/Shell";
import { StatusBadge, Table, EmptyState } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { setAccountStatus } from "../actions";

export default async function AdminCustomers() {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    include: { master: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        description="All customers and the seller they belong to."
      />
      {customers.length === 0 ? (
        <EmptyState>No customers yet.</EmptyState>
      ) : (
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Assigned seller</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          }
        >
          {customers.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3">
                <div className="font-medium text-tea-100">{c.name}</div>
                <div className="text-xs text-tea-400">{c.email ?? c.phone}</div>
              </td>
              <td className="px-4 py-3 text-tea-300">{c.master?.name ?? "—"}</td>
              <td className="px-4 py-3 text-tea-400">{dateTime(c.createdAt)}</td>
              <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
              <td className="px-4 py-3">
                <form action={setAccountStatus} className="flex items-center gap-2">
                  <input type="hidden" name="userId" value={c.id} />
                  <select name="status" defaultValue={c.status} className="input max-w-[9rem] py-1">
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING">Pending</option>
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
