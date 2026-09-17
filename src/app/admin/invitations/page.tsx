import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/Shell";
import { StatusBadge, Table, EmptyState } from "@/components/ui";
import { InviteLink } from "@/components/InviteLink";
import { dateTime } from "@/lib/format";
import { getSettingNumber, SETTING_KEYS } from "@/lib/settings";
import { createSellerInvitation, revokeInvitation } from "../actions";

export default async function AdminInvitations() {
  const [levels, invitations, defaultHours] = await Promise.all([
    prisma.sellerLevel.findMany({ orderBy: { rank: "asc" } }),
    prisma.invitation.findMany({
      where: { type: "SELLER" },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    getSettingNumber(SETTING_KEYS.INVITE_EXPIRY_HOURS),
  ]);

  return (
    <div>
      <PageHeader
        title="Seller invitations"
        description="Generate one-time, expiring registration links for approved seller applicants."
      />

      <div className="card mb-6">
        <form action={createSellerInvitation} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="levelId">Seller level</label>
            <select id="levelId" name="levelId" className="input min-w-[10rem]">
              {levels.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="hours">Expires in (hours)</label>
            <input id="hours" name="hours" type="number" min={1} defaultValue={defaultHours} className="input w-32" />
          </div>
          <button type="submit" className="btn-primary">Generate link</button>
        </form>
      </div>

      {invitations.length === 0 ? (
        <EmptyState>No invitations generated yet.</EmptyState>
      ) : (
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Link</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          }
        >
          {invitations.map((inv) => (
            <tr key={inv.id}>
              <td className="px-4 py-3">
                {inv.status === "ACTIVE" ? (
                  <InviteLink path={`/register/${inv.token}`} />
                ) : (
                  <span className="text-xs text-tea-500">—</span>
                )}
              </td>
              <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
              <td className="px-4 py-3 text-tea-400">{dateTime(inv.expiresAt)}</td>
              <td className="px-4 py-3 text-tea-400">{dateTime(inv.createdAt)}</td>
              <td className="px-4 py-3">
                {inv.status === "ACTIVE" && (
                  <form action={revokeInvitation}>
                    <input type="hidden" name="id" value={inv.id} />
                    <button type="submit" className="btn-ghost py-1 text-xs text-red-300">Revoke</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
