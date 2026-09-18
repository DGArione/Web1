import "server-only";
import { prisma } from "./db";
import { getSettingNumber, SETTING_KEYS } from "./settings";
import { notify } from "./notify";

/**
 * Sum of a seller's unpaid commission (PENDING + DUE + OVERDUE) — the amount a
 * settlement submission is expected to cover (§20).
 */
export async function outstandingForSeller(sellerId: string): Promise<number> {
  const agg = await prisma.commissionEntry.aggregate({
    _sum: { commissionDue: true },
    where: { sellerId, status: { in: ["PENDING", "DUE", "OVERDUE"] } },
  });
  return Math.round((agg._sum.commissionDue ?? 0) * 100) / 100;
}

export interface EscalationResult {
  markedDue: number;
  markedOverdue: number;
  sellersRestricted: number;
  sellersDeactivated: number;
}

/**
 * Escalation engine (§21). Idempotent — safe to run repeatedly (manually by an
 * admin, or from a scheduled job). Transitions:
 *   PENDING → DUE          once the due date passes
 *   DUE     → OVERDUE      once the grace period after the due date passes
 * and, for the accounts involved:
 *   any OVERDUE commission            → seller RESTRICTED (+ reminder)
 *   OVERDUE beyond the deactivate window → seller INACTIVE
 * Sellers with no unpaid overdue commission are lifted back to ACTIVE if they
 * were only RESTRICTED by this process.
 */
export async function runEscalation(): Promise<EscalationResult> {
  const graceDays = await getSettingNumber(SETTING_KEYS.OVERDUE_GRACE_DAYS);
  const deactivateDays = await getSettingNumber(SETTING_KEYS.OVERDUE_DEACTIVATE_DAYS);
  const now = Date.now();
  const graceCutoff = new Date(now - graceDays * 86400 * 1000);
  const deactivateCutoff = new Date(now - deactivateDays * 86400 * 1000);

  // PENDING → DUE (due date reached)
  const due = await prisma.commissionEntry.updateMany({
    where: { status: "PENDING", dueDate: { not: null, lte: new Date(now) } },
    data: { status: "DUE" },
  });

  // DUE → OVERDUE (past due date + grace)
  const overdue = await prisma.commissionEntry.updateMany({
    where: { status: "DUE", dueDate: { not: null, lte: graceCutoff } },
    data: { status: "OVERDUE" },
  });

  // Sellers currently carrying overdue commission.
  const overdueGroups = await prisma.commissionEntry.groupBy({
    by: ["sellerId"],
    where: { status: "OVERDUE" },
    _min: { dueDate: true },
  });

  let sellersRestricted = 0;
  let sellersDeactivated = 0;

  for (const g of overdueGroups) {
    const seller = await prisma.user.findUnique({ where: { id: g.sellerId } });
    if (!seller || seller.role !== "SELLER") continue;
    // Skip if an admin has already disabled the account entirely.
    if (seller.status === "DISABLED") continue;

    const oldestOverdue = g._min.dueDate;
    const shouldDeactivate =
      deactivateDays > 0 && oldestOverdue != null && oldestOverdue <= deactivateCutoff;

    if (shouldDeactivate && seller.status !== "INACTIVE") {
      await prisma.user.update({ where: { id: seller.id }, data: { status: "INACTIVE" } });
      await notify(
        seller.id,
        "Account deactivated — overdue commission",
        "Your account has been deactivated due to long-overdue platform commission. Settle the balance and request reactivation."
      );
      sellersDeactivated++;
    } else if (!shouldDeactivate && seller.status === "ACTIVE") {
      await prisma.user.update({ where: { id: seller.id }, data: { status: "RESTRICTED" } });
      await notify(
        seller.id,
        "Account restricted — overdue commission",
        "You have overdue platform commission. Please settle it to restore full access."
      );
      sellersRestricted++;
    }
  }

  // Lift restriction for sellers who no longer have overdue commission but were
  // restricted by this process.
  const restricted = await prisma.user.findMany({
    where: { role: "SELLER", status: "RESTRICTED" },
    select: { id: true },
  });
  for (const s of restricted) {
    const stillOverdue = await prisma.commissionEntry.count({
      where: { sellerId: s.id, status: "OVERDUE" },
    });
    if (stillOverdue === 0) {
      await prisma.user.update({ where: { id: s.id }, data: { status: "ACTIVE" } });
      await notify(s.id, "Account restriction lifted", "Your overdue commission is cleared. Full access restored.");
    }
  }

  return {
    markedDue: due.count,
    markedOverdue: overdue.count,
    sellersRestricted,
    sellersDeactivated,
  };
}
