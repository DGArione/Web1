export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-tea-400">{label}</p>
      <p className="mt-2 font-serif text-2xl font-semibold text-tea-50">{value}</p>
      {sub && <p className="mt-1 text-xs text-tea-400">{sub}</p>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  // account
  ACTIVE: "bg-tea-500/20 text-tea-200",
  PENDING: "bg-gold-500/20 text-gold-400",
  INACTIVE: "bg-tea-700/40 text-tea-300",
  RESTRICTED: "bg-orange-500/20 text-orange-300",
  DISABLED: "bg-red-500/20 text-red-300",
  // orders
  CREATED: "bg-tea-700/40 text-tea-200",
  AWAITING_PAYMENT: "bg-gold-500/20 text-gold-400",
  PROOF_SUBMITTED: "bg-blue-500/20 text-blue-300",
  PAYMENT_VERIFIED: "bg-tea-500/20 text-tea-200",
  READY_FOR_COLLECTION: "bg-tea-500/20 text-tea-200",
  COMPLETED: "bg-tea-500/25 text-tea-100",
  CANCELLED: "bg-red-500/20 text-red-300",
  // payments
  SUBMITTED: "bg-blue-500/20 text-blue-300",
  VERIFIED: "bg-tea-500/20 text-tea-200",
  REJECTED: "bg-red-500/20 text-red-300",
  // settlement
  DUE: "bg-gold-500/20 text-gold-400",
  PAID: "bg-tea-500/20 text-tea-200",
  OVERDUE: "bg-red-500/20 text-red-300",
  // applications / invitations
  APPROVED: "bg-tea-500/20 text-tea-200",
  USED: "bg-tea-700/40 text-tea-300",
  EXPIRED: "bg-tea-800/60 text-tea-400",
  REVOKED: "bg-red-500/20 text-red-300",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-tea-700/40 text-tea-200";
  return <span className={`badge ${style}`}>{status.replace(/_/g, " ").toLowerCase()}</span>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="card text-center text-sm text-tea-400">{children}</div>
  );
}

export function Table({
  head,
  children,
}: {
  head: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-tea-800/60">
      <table className="min-w-full divide-y divide-tea-800/60 text-sm">
        <thead className="bg-tea-900/50 text-left text-xs uppercase tracking-wide text-tea-400">
          {head}
        </thead>
        <tbody className="divide-y divide-tea-800/40">{children}</tbody>
      </table>
    </div>
  );
}
