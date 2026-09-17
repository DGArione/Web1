import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/Shell";
import { money } from "@/lib/format";
import { saveLevel, savePolicy } from "../actions";

function LevelForm({ level }: { level?: any }) {
  return (
    <form action={saveLevel} className="card space-y-3">
      {level && <input type="hidden" name="id" value={level.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Name</label>
          <input name="name" defaultValue={level?.name ?? ""} className="input" required />
        </div>
        <div>
          <label className="label">Rank (order)</label>
          <input name="rank" type="number" min={1} defaultValue={level?.rank ?? ""} className="input" required />
        </div>
        <div>
          <label className="label">Commission %</label>
          <input name="commissionPct" type="number" step="0.1" defaultValue={level?.commissionPct ?? 0} className="input" />
        </div>
        <div>
          <label className="label">Min sales ($)</label>
          <input name="minSales" type="number" defaultValue={level?.minSales ?? 0} className="input" />
        </div>
        <div>
          <label className="label">Min points</label>
          <input name="minPoints" type="number" defaultValue={level?.minPoints ?? 0} className="input" />
        </div>
        <div>
          <label className="label">Registration fee ($)</label>
          <input name="registrationFee" type="number" defaultValue={level?.registrationFee ?? 0} className="input" />
        </div>
        <div>
          <label className="label">Credit days</label>
          <input name="creditDays" type="number" defaultValue={level?.creditDays ?? 0} className="input" />
        </div>
        <div>
          <label className="label">Inactivity days</label>
          <input name="inactivityDays" type="number" defaultValue={level?.inactivityDays ?? 0} className="input" />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-tea-300">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="canRecruit" defaultChecked={level?.canRecruit} /> Can recruit sellers
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="creditAllowed" defaultChecked={level?.creditAllowed} /> Credit allowed
        </label>
      </div>
      <button type="submit" className="btn-primary">{level ? "Update level" : "Create level"}</button>
    </form>
  );
}

export default async function AdminLevels() {
  const [levels, brackets] = await Promise.all([
    prisma.sellerLevel.findMany({ orderBy: { rank: "asc" }, include: { policy: true, _count: { select: { users: true } } } }),
    prisma.commissionBracket.findMany({ orderBy: { minPrice: "asc" } }),
  ]);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Seller levels & policies"
        description="Levels are fully configurable — there is no fixed maximum. Each has its own commission, fees and permissions."
      />

      <div className="card mb-6">
        <h2 className="mb-2 font-serif text-lg font-semibold">Commission brackets by price</h2>
        <p className="mb-3 text-xs text-tea-400">
          Applied when a sale amount falls in the bracket; otherwise the seller level commission is used.
        </p>
        <div className="flex flex-wrap gap-2">
          {brackets.map((b) => (
            <span key={b.id} className="badge bg-tea-700/50 text-tea-100">
              {money(b.minPrice)}–{b.maxPrice ? money(b.maxPrice) : "∞"} → {b.pct}%
            </span>
          ))}
        </div>
      </div>

      <h2 className="mb-3 font-serif text-lg font-semibold">Existing levels</h2>
      <div className="space-y-8">
        {levels.map((l) => (
          <div key={l.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-semibold text-gold-400">
                {l.name} <span className="text-xs text-tea-400">· rank {l.rank} · {l._count.users} member(s)</span>
              </h3>
            </div>
            <LevelForm level={l} />
            <form action={savePolicy} className="card">
              <input type="hidden" name="levelId" value={l.id} />
              <label className="label">Policy (version {l.policy?.version ?? 1})</label>
              <textarea name="content" rows={5} defaultValue={l.policy?.content ?? ""} className="input font-mono text-xs" />
              <button type="submit" className="btn-ghost mt-3">Save policy (notifies sellers)</button>
            </form>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-10 font-serif text-lg font-semibold">Create a new level</h2>
      <LevelForm />
    </div>
  );
}
