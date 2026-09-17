import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/Shell";
import { Table, EmptyState } from "@/components/ui";
import { money } from "@/lib/format";

export default async function AdminProducts() {
  const products = await prisma.product.findMany({
    include: { seller: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Products" description="Every product across all seller shops." />
      {products.length === 0 ? (
        <EmptyState>No products yet.</EmptyState>
      ) : (
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          }
        >
          {products.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 font-medium text-tea-100">{p.name}</td>
              <td className="px-4 py-3 text-tea-300">{p.seller.name}</td>
              <td className="px-4 py-3 text-tea-400">{p.code}</td>
              <td className="px-4 py-3 text-tea-300">{money(p.price)}</td>
              <td className="px-4 py-3 text-tea-300">{p.stock}</td>
              <td className="px-4 py-3 text-tea-300">{p.active ? "Yes" : "No"}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
