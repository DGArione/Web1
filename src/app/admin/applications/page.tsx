import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/Shell";
import { StatusBadge, Table, EmptyState } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { reviewApplication } from "../actions";

export default async function AdminApplications() {
  const apps = await prisma.sellerApplication.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
  });

  return (
    <div>
      <PageHeader
        title="Seller applications"
        description="Direct requests submitted through the public website. Approve to then issue an invitation."
      />
      {apps.length === 0 ? (
        <EmptyState>No applications yet.</EmptyState>
      ) : (
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Decision</th>
            </tr>
          }
        >
          {apps.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3">
                <div className="font-medium text-tea-100">{a.name}</div>
                <div className="text-xs text-tea-400">{a.email}{a.phone ? ` · ${a.phone}` : ""}</div>
              </td>
              <td className="px-4 py-3 max-w-xs text-tea-300">{a.message ?? "—"}</td>
              <td className="px-4 py-3 text-tea-400">{dateTime(a.createdAt)}</td>
              <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
              <td className="px-4 py-3">
                {a.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <form action={reviewApplication}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="decision" value="APPROVED" />
                      <button type="submit" className="btn-primary py-1 text-xs">Approve</button>
                    </form>
                    <form action={reviewApplication}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="decision" value="REJECTED" />
                      <button type="submit" className="btn-ghost py-1 text-xs text-red-300">Reject</button>
                    </form>
                  </div>
                ) : (
                  <span className="text-xs text-tea-500">Reviewed {dateTime(a.reviewedAt)}</span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
      <p className="mt-4 text-xs text-tea-500">
        After approving, go to <span className="text-tea-300">Invitations</span> to generate a one-time
        registration link for the applicant.
      </p>
    </div>
  );
}
