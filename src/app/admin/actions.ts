"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { generateToken } from "@/lib/tokens";
import { getSettingNumber, setSetting, SETTING_KEYS } from "@/lib/settings";
import { runEscalation } from "@/lib/settlement";
import { notify } from "@/lib/notify";

// --- Seller invitations (§10) ------------------------------------------------
export async function createSellerInvitation(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");
  const levelId = String(formData.get("levelId") ?? "");
  const hoursRaw = Number(formData.get("hours"));
  const defaultHours = await getSettingNumber(SETTING_KEYS.INVITE_EXPIRY_HOURS);
  const hours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : defaultHours;

  await prisma.invitation.create({
    data: {
      token: generateToken(),
      type: "SELLER",
      createdById: admin.id,
      levelId: levelId || null,
      expiresAt: new Date(Date.now() + hours * 3600 * 1000),
    },
  });
  revalidatePath("/admin/invitations");
}

export async function revokeInvitation(formData: FormData): Promise<void> {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  await prisma.invitation.updateMany({
    where: { id, status: "ACTIVE" },
    data: { status: "REVOKED" },
  });
  revalidatePath("/admin/invitations");
}

// --- Applications review (§10) ----------------------------------------------
export async function reviewApplication(formData: FormData): Promise<void> {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "APPROVED" && decision !== "REJECTED") return;
  await prisma.sellerApplication.update({
    where: { id },
    data: { status: decision as "APPROVED" | "REJECTED", reviewedAt: new Date() },
  });
  revalidatePath("/admin/applications");
}

// --- Account status (§3) ----------------------------------------------------
export async function setAccountStatus(formData: FormData): Promise<void> {
  await requireRole("ADMIN");
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");
  const valid = ["ACTIVE", "INACTIVE", "RESTRICTED", "DISABLED", "PENDING"];
  if (!valid.includes(status)) return;
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role === "ADMIN") return;
  await prisma.user.update({
    where: { id: userId },
    data: { status: status as never },
  });
  await notify(userId, "Account status updated", `Your account status is now ${status}.`);
  revalidatePath("/admin/sellers");
  revalidatePath("/admin/customers");
}

// --- Settings (§18, §29) ----------------------------------------------------
export async function saveSettings(formData: FormData): Promise<void> {
  await requireRole("ADMIN");
  const keys = Object.values(SETTING_KEYS);
  for (const key of keys) {
    if (formData.has(key)) {
      await setSetting(key, String(formData.get(key) ?? ""));
    }
  }
  revalidatePath("/admin/settings");
}

// --- Levels (§4) ------------------------------------------------------------
export async function saveLevel(formData: FormData): Promise<void> {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const data = {
    name: String(formData.get("name") ?? "").trim(),
    rank: Number(formData.get("rank")) || 1,
    minSales: Number(formData.get("minSales")) || 0,
    minPoints: Number(formData.get("minPoints")) || 0,
    commissionPct: Number(formData.get("commissionPct")) || 0,
    registrationFee: Number(formData.get("registrationFee")) || 0,
    canRecruit: formData.get("canRecruit") === "on",
    creditAllowed: formData.get("creditAllowed") === "on",
    creditDays: Number(formData.get("creditDays")) || 0,
    inactivityDays: Number(formData.get("inactivityDays")) || 0,
  };
  if (!data.name) return;

  if (id) {
    await prisma.sellerLevel.update({ where: { id }, data });
  } else {
    const level = await prisma.sellerLevel.create({ data });
    await prisma.policy.create({
      data: { levelId: level.id, content: `# ${data.name} Level Policy\n\nCommission: ${data.commissionPct}%` },
    });
  }
  revalidatePath("/admin/levels");
}

export async function savePolicy(formData: FormData): Promise<void> {
  await requireRole("ADMIN");
  const levelId = String(formData.get("levelId") ?? "");
  const content = String(formData.get("content") ?? "");
  const policy = await prisma.policy.findUnique({ where: { levelId } });
  if (policy) {
    await prisma.policy.update({
      where: { levelId },
      data: { content, version: policy.version + 1 },
    });
    // Notify sellers at this level of the updated policy (§28).
    const sellers = await prisma.user.findMany({ where: { levelId }, select: { id: true } });
    if (sellers.length) {
      await prisma.notification.createMany({
        data: sellers.map((s) => ({
          userId: s.id,
          title: "Policy updated",
          body: "Your level policy has changed. Please review and acknowledge it.",
        })),
      });
    }
  } else {
    await prisma.policy.create({ data: { levelId, content } });
  }
  revalidatePath("/admin/levels");
}

// --- Settlement confirmation (§20) ------------------------------------------
export async function confirmSettlement(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const settlement = await prisma.settlement.findUnique({
    where: { id },
    include: { entries: { select: { id: true } } },
  });
  if (!settlement || settlement.status !== "SUBMITTED") return;

  await prisma.$transaction([
    prisma.settlement.update({
      where: { id },
      data: { status: "CONFIRMED", confirmedById: admin.id, confirmedAt: new Date() },
    }),
    prisma.commissionEntry.updateMany({
      where: { id: { in: settlement.entries.map((e) => e.id) } },
      data: { status: "PAID", paidAt: new Date() },
    }),
  ]);

  // If the seller is only RESTRICTED and now has no overdue commission, restore.
  const seller = await prisma.user.findUnique({ where: { id: settlement.sellerId } });
  if (seller?.status === "RESTRICTED") {
    const stillOverdue = await prisma.commissionEntry.count({
      where: { sellerId: seller.id, status: "OVERDUE" },
    });
    if (stillOverdue === 0) {
      await prisma.user.update({ where: { id: seller.id }, data: { status: "ACTIVE" } });
    }
  }

  await notify(
    settlement.sellerId,
    "Settlement confirmed",
    `Your commission settlement of $${settlement.amount.toFixed(2)} has been confirmed.`
  );
  revalidatePath("/admin/finance");
}

export async function rejectSettlement(formData: FormData): Promise<void> {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const settlement = await prisma.settlement.findUnique({ where: { id } });
  if (!settlement || settlement.status !== "SUBMITTED") return;

  await prisma.$transaction([
    // Release the entries so they can be settled again.
    prisma.commissionEntry.updateMany({
      where: { settlementId: id },
      data: { settlementId: null },
    }),
    prisma.settlement.update({ where: { id }, data: { status: "REJECTED" } }),
  ]);

  await notify(
    settlement.sellerId,
    "Settlement not accepted",
    "Your commission settlement was not accepted. Please review and re-submit."
  );
  revalidatePath("/admin/finance");
}

// --- Escalation of overdue commission (§21) ---------------------------------
export async function processEscalation(): Promise<void> {
  await requireRole("ADMIN");
  await runEscalation();
  revalidatePath("/admin/finance");
  revalidatePath("/admin/sellers");
}

// --- Emergency data purge (§30) ---------------------------------------------
export async function emergencyPurge(formData: FormData): Promise<void> {
  const admin = await requireRole("ADMIN");
  const confirm = String(formData.get("confirm") ?? "");
  const scope = String(formData.get("scope") ?? "");
  if (confirm !== "PURGE") return;

  // Only transactional/temporary data can be purged here. Account and financial
  // ledger data are protected (§24, §30).
  if (scope === "expired_order_info") {
    await prisma.order.updateMany({
      where: { expiresAt: { lt: new Date() } },
      data: { paymentInfo: null, collectionInfo: null },
    });
  } else if (scope === "notifications") {
    await prisma.notification.deleteMany({ where: { read: true } });
  }
  await notify(admin.id, "Emergency purge executed", `Scope: ${scope}`);
  revalidatePath("/admin");
}
