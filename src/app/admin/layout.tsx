import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/Shell";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/sellers", label: "Sellers" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/levels", label: "Levels & Policies" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/invitations", label: "Invitations" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("ADMIN");
  return (
    <DashboardShell
      brand="Ceylon Traders"
      roleLabel="Administrator"
      userName={user.name}
      nav={NAV}
    >
      {children}
    </DashboardShell>
  );
}
