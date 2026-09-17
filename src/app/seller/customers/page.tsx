import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/Shell";
import { StatusBadge, Table, EmptyState } from "@/components/ui";
import { InviteLink } from "@/components/InviteLink";
import { dateTime } from "@/lib/format";
import { createCustomerInvitation, reviewCustomer } from "../actions";

export default async function SellerCustomers() {
  const me = await requireRole("SELLER");
  const [customers, invites] = await Promise.all([
    prisma.user.findMany({
      where: { masterId: me.id, role: "CUSTOMER" },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.invitation.findMany({
      where: { createdById: me.id, type: "CUSTOMER", status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="My customers"
        description="Invite customers and approve their applications. Customers only see your shop."
      />

      <div className="card mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-base font-semibold">Invite a customer</h2>
            <p className="text-xs text-tea-400">Generates a one-time, expiring registration link.</p>
          </div>
          <form action={createCustomerInvitation}>
            <button type="submit" className="btn-primary">Generate invitation</button>
          </form>
        </div>
        {invites.length > 0 && (
          <div className="mt-4 space-y-2">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3">
                <InviteLink path={`/register/${inv.token}`} />
                <span className="text-xs text-tea-400">{dateTime(inv.expiresAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {customers.length === 0 ? (
        <EmptyState>No customers yet. Share an invitation link to onboard one.</EmptyState>
      ) : (
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Customer</th>
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
              <td className="px-4 py-3 text-tea-400">{dateTime(c.createdAt)}</td>
              <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
              <td className="px-4 py-3">
                {c.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <form action={reviewCustomer}>
                      <input type="hidden" name="userId" value={c.id} />
                      <input type="hidden" name="decision" value="APPROVE" />
                      <button type="submit" className="btn-primary py-1 text-xs">Approve</button>
                    </form>
                    <form action={reviewCustomer}>
                      <input type="hidden" name="userId" value={c.id} />
                      <input type="hidden" name="decision" value="REJECT" />
                      <button type="submit" className="btn-ghost py-1 text-xs text-red-300">Reject</button>
                    </form>
                  </div>
                ) : (
                  <span className="text-xs text-tea-500">—</span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
