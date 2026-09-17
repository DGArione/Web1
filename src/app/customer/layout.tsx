import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/Shell";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("CUSTOMER");
  const nav = [
    { href: "/customer", label: "Shop" },
    { href: "/customer/orders", label: "My Orders" },
    { href: "/customer/notifications", label: "Notifications" },
  ];
  return (
    <DashboardShell brand="Ceylon Traders" roleLabel="Customer" userName={user.name} nav={nav}>
      {children}
    </DashboardShell>
  );
}
