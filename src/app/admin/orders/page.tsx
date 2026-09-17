import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/Shell";
import { StatusBadge, Table, EmptyState } from "@/components/ui";
import { money, dateTime } from "@/lib/format";

export default async function AdminOrders() {
  const orders = await prisma.order.findMany({
    include: {
      customer: { select: { name: true } },
      seller: { select: { name: true } },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Orders" description="All orders and their payment/verification status." />
      {orders.length === 0 ? (
        <EmptyState>No orders yet.</EmptyState>
      ) : (
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          }
        >
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="px-4 py-3 font-mono text-xs text-tea-400">{o.id.slice(0, 8)}</td>
              <td className="px-4 py-3 text-tea-300">{o.customer.name}</td>
              <td className="px-4 py-3 text-tea-300">{o.seller.name}</td>
              <td className="px-4 py-3 text-tea-300">{money(o.total)}</td>
              <td className="px-4 py-3">
                {o.payment ? <StatusBadge status={o.payment.status} /> : <span className="text-xs text-tea-500">—</span>}
              </td>
              <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
              <td className="px-4 py-3 text-tea-400">{dateTime(o.createdAt)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
