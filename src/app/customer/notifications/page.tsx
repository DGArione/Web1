import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/Shell";
import { EmptyState } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { markNotificationsRead } from "../actions";

export default async function CustomerNotifications() {
  const me = await requireRole("CUSTOMER");
  const notifs = await prisma.notification.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Notifications"
        description="Order updates, payment verification and collection information."
        action={
          <form action={markNotificationsRead}>
            <button type="submit" className="btn-ghost">Mark all read</button>
          </form>
        }
      />
      {notifs.length === 0 ? (
        <EmptyState>No notifications.</EmptyState>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <div key={n.id} className={`card ${n.read ? "opacity-60" : "border-gold-500/30"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-tea-100">{n.title}</p>
                  {n.body && <p className="text-sm text-tea-300">{n.body}</p>}
                </div>
                <span className="shrink-0 text-xs text-tea-400">{dateTime(n.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
