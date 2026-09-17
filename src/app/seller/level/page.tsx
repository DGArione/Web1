import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/Shell";
import { StatCard, EmptyState } from "@/components/ui";
import { money } from "@/lib/format";
import { acknowledgePolicy } from "../actions";

export default async function SellerLevel() {
  const me = await requireRole("SELLER");
  const level = me.levelId
    ? await prisma.sellerLevel.findUnique({ where: { id: me.levelId }, include: { policy: true } })
    : null;

  // Next level = the level ranked immediately above the current one.
  const nextLevel = level
    ? await prisma.sellerLevel.findFirst({
        where: { rank: { gt: level.rank } },
        orderBy: { rank: "asc" },
        include: { policy: true },
      })
    : null;

  const eligible =
    nextLevel != null &&
    me.totalSales >= nextLevel.minSales &&
    me.points >= nextLevel.minPoints;

  const ackNext = nextLevel?.policy
    ? await prisma.policyAcknowledgement.findFirst({
        where: { userId: me.id, policyId: nextLevel.policy.id, version: nextLevel.policy.version },
      })
    : null;

  return (
    <div className="max-w-3xl">
      <PageHeader title="My level" description="Your rank, requirements and promotion status." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Current level" value={level?.name ?? "—"} />
        <StatCard label="Total sales" value={money(me.totalSales)} />
        <StatCard label="Points" value={me.points} />
      </div>

      {level?.policy && (
        <div className="card mt-6">
          <h2 className="mb-2 font-serif text-lg font-semibold">
            {level.name} policy (v{level.policy.version})
          </h2>
          <pre className="whitespace-pre-wrap text-sm text-tea-300">{level.policy.content}</pre>
        </div>
      )}

      <h2 className="mb-3 mt-8 font-serif text-lg font-semibold">Promotion</h2>
      {!nextLevel ? (
        <EmptyState>You are at the highest configured level.</EmptyState>
      ) : eligible ? (
        <div className="card border-gold-500/40">
          <p className="text-sm text-tea-200">
            🎉 You are eligible for <span className="font-semibold text-gold-400">{nextLevel.name}</span>.
          </p>
          <div className="mt-3 rounded-md bg-tea-950/60 p-3 text-sm text-tea-300">
            <p className="font-semibold text-tea-100">{nextLevel.name} policy</p>
            <p>Commission: {nextLevel.commissionPct}%</p>
            <p>Minimum sales: {money(nextLevel.minSales)}</p>
            {nextLevel.policy && (
              <pre className="mt-2 whitespace-pre-wrap text-xs">{nextLevel.policy.content}</pre>
            )}
          </div>
          {nextLevel.policy && !ackNext ? (
            <form action={acknowledgePolicy} className="mt-4">
              <input type="hidden" name="policyId" value={nextLevel.policy.id} />
              <input type="hidden" name="version" value={nextLevel.policy.version} />
              <label className="flex items-center gap-2 text-sm text-tea-200">
                <input type="checkbox" required /> I acknowledge and accept the {nextLevel.name} policies.
              </label>
              <button type="submit" className="btn-gold mt-3">Accept level</button>
              <p className="mt-2 text-xs text-tea-400">
                (Acknowledgement is recorded. Final promotion is confirmed by your administrator.)
              </p>
            </form>
          ) : (
            <p className="mt-4 text-sm text-tea-200">
              ✓ Policy acknowledged. Your administrator will confirm the promotion.
            </p>
          )}
        </div>
      ) : (
        <div className="card">
          <p className="text-sm text-tea-300">
            Next level: <span className="font-semibold text-tea-100">{nextLevel.name}</span>
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <Requirement label="Sales" current={me.totalSales} target={nextLevel.minSales} money />
            <Requirement label="Points" current={me.points} target={nextLevel.minPoints} />
          </div>
        </div>
      )}
    </div>
  );
}

function Requirement({
  label,
  current,
  target,
  money: isMoney,
}: {
  label: string;
  current: number;
  target: number;
  money?: boolean;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100;
  const fmt = (n: number) => (isMoney ? money(n) : String(n));
  return (
    <div>
      <div className="flex justify-between text-xs text-tea-400">
        <span>{label}</span>
        <span>{fmt(current)} / {fmt(target)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-tea-800">
        <div className="h-full bg-tea-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
