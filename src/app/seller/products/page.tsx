import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/Shell";
import { Table, EmptyState } from "@/components/ui";
import { money } from "@/lib/format";
import { createProduct, toggleProduct } from "../actions";

export default async function SellerProducts() {
  const me = await requireRole("SELLER");
  const products = await prisma.product.findMany({
    where: { sellerId: me.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="My products" description="Create and manage the products in your shop." />

      <div className="card mb-6">
        <h2 className="mb-3 font-serif text-base font-semibold">Add a product</h2>
        <form action={createProduct} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input name="name" className="input" required />
          </div>
          <div>
            <label className="label">Code</label>
            <input name="code" className="input" required />
          </div>
          <div>
            <label className="label">Price ($)</label>
            <input name="price" type="number" step="0.01" min={0} className="input" required />
          </div>
          <div>
            <label className="label">Stock</label>
            <input name="stock" type="number" min={0} defaultValue={0} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <textarea name="description" rows={2} className="input" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">Add product</button>
          </div>
        </form>
      </div>

      {products.length === 0 ? (
        <EmptyState>No products yet.</EmptyState>
      ) : (
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3"></th>
            </tr>
          }
        >
          {products.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 font-medium text-tea-100">{p.name}</td>
              <td className="px-4 py-3 text-tea-400">{p.code}</td>
              <td className="px-4 py-3 text-tea-300">{money(p.price)}</td>
              <td className="px-4 py-3 text-tea-300">{p.stock}</td>
              <td className="px-4 py-3 text-tea-300">{p.active ? "Yes" : "No"}</td>
              <td className="px-4 py-3">
                <form action={toggleProduct}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="btn-ghost py-1 text-xs">
                    {p.active ? "Deactivate" : "Activate"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
