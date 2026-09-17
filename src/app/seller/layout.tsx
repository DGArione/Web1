import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/Shell";
import { prisma } from "@/lib/db";

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("SELLER");
  const unread = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  const nav = [
    { href: "/seller", label: "Overview" },
    { href: "/seller/products", label: "Products" },
    { href: "/seller/customers", label: "Customers" },
    { href: "/seller/orders", label: "Orders" },
    { href: "/seller/finance", label: "Commission" },
    { href: "/seller/level", label: "My Level" },
    { href: "/seller/notifications", label: `Notifications${unread ? ` (${unread})` : ""}` },
  ];

  return (
    <DashboardShell brand="Ceylon Traders" roleLabel="Seller" userName={user.name} nav={nav}>
      {children}
    </DashboardShell>
  );
}
