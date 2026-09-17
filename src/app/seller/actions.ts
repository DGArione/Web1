"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { generateToken } from "@/lib/tokens";
import { getSettingNumber, SETTING_KEYS } from "@/lib/settings";
import { resolveCommissionPct, commissionDue } from "@/lib/commission";
import { notify } from "@/lib/notify";

async function seller() {
  return requireRole("SELLER");
}

// --- Products (§13) ---------------------------------------------------------
export async function createProduct(formData: FormData): Promise<void> {
  const me = await seller();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const price = Number(formData.get("price"));
  if (!name || !code || !Number.isFinite(price)) return;
  await prisma.product.create({
    data: {
      sellerId: me.id,
      name,
      code,
      description: String(formData.get("description") ?? ""),
      price,
      stock: Number(formData.get("stock")) || 0,
    },
  });
  revalidatePath("/seller/products");
}

export async function toggleProduct(formData: FormData): Promise<void> {
  const me = await seller();
  const id = String(formData.get("id") ?? "");
  const product = await prisma.product.findFirst({ where: { id, sellerId: me.id } });
  if (!product) return;
  await prisma.product.update({ where: { id }, data: { active: !product.active } });
  revalidatePath("/seller/products");
}

// --- Customer invitations (§8, §9) ------------------------------------------
export async function createCustomerInvitation(): Promise<void> {
  const me = await seller();
  const hours = await getSettingNumber(SETTING_KEYS.INVITE_EXPIRY_HOURS);
  await prisma.invitation.create({
    data: {
      token: generateToken(),
      type: "CUSTOMER",
      createdById: me.id,
      expiresAt: new Date(Date.now() + hours * 3600 * 1000),
    },
  });
  revalidatePath("/seller/customers");
}

export async function reviewCustomer(formData: FormData): Promise<void> {
  const me = await seller();
  const userId = String(formData.get("userId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const customer = await prisma.user.findFirst({
    where: { id: userId, masterId: me.id, role: "CUSTOMER" },
  });
  if (!customer) return;
  if (decision === "APPROVE") {
    await prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
    await notify(userId, "Account approved", "Your seller has approved your account. You can now shop.");
  } else if (decision === "REJECT") {
    await prisma.user.update({ where: { id: userId }, data: { status: "DISABLED" } });
  }
  revalidatePath("/seller/customers");
}

// --- Order lifecycle (§15) --------------------------------------------------
export async function provideOrderInfo(formData: FormData): Promise<void> {
  const me = await seller();
  const orderId = String(formData.get("orderId") ?? "");
  const paymentInfo = String(formData.get("paymentInfo") ?? "").trim();
  const order = await prisma.order.findFirst({ where: { id: orderId, sellerId: me.id } });
  if (!order || order.status !== "CREATED") return;
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentInfo, status: "AWAITING_PAYMENT" },
  });
  await notify(order.customerId, "Payment information available", "Your seller has provided payment details for your order.");
  revalidatePath("/seller/orders");
}

export async function verifyPayment(formData: FormData): Promise<void> {
  const me = await seller();
  const orderId = String(formData.get("orderId") ?? "");
  const collectionInfo = String(formData.get("collectionInfo") ?? "").trim();
  const decision = String(formData.get("decision") ?? "verify");

  const order = await prisma.order.findFirst({
    where: { id: orderId, sellerId: me.id },
    include: { payment: true },
  });
  if (!order || !order.payment) return;

  if (decision === "reject") {
    await prisma.payment.update({
      where: { id: order.payment.id },
      data: { status: "REJECTED", verifiedById: me.id, verifiedAt: new Date() },
    });
    await prisma.order.update({ where: { id: orderId }, data: { status: "AWAITING_PAYMENT" } });
    await notify(order.customerId, "Payment not accepted", "Your payment proof was not accepted. Please re-submit.");
    revalidatePath("/seller/orders");
    return;
  }

  if (order.status !== "PROOF_SUBMITTED") return;

  // Verify payment, reveal collection info, and record the commission ledger entry.
  const level = me.levelId
    ? await prisma.sellerLevel.findUnique({ where: { id: me.levelId } })
    : null;
  const pct = await resolveCommissionPct(order.total, level?.commissionPct ?? 0);
  const due = commissionDue(order.total, pct);
  const settlementDays = await getSettingNumber(SETTING_KEYS.SETTLEMENT_DAYS);
  const expireSeconds = await getSettingNumber(SETTING_KEYS.EXPIRE_ORDER_INFO_SECONDS);

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: order.payment.id },
      data: { status: "VERIFIED", verifiedById: me.id, verifiedAt: new Date() },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: {
        status: "READY_FOR_COLLECTION",
        collectionInfo,
        expiresAt: new Date(Date.now() + expireSeconds * 1000),
      },
    }),
    prisma.commissionEntry.create({
      data: {
        sellerId: me.id,
        orderId: order.id,
        saleAmount: order.total,
        commissionPct: pct,
        commissionDue: due,
        status: settlementDays > 0 ? "PENDING" : "DUE",
        dueDate: settlementDays > 0 ? new Date(Date.now() + settlementDays * 86400 * 1000) : new Date(),
      },
    }),
    prisma.user.update({
      where: { id: me.id },
      data: { totalSales: { increment: order.total }, points: { increment: Math.round(order.total / 100) } },
    }),
  ]);

  await notify(order.customerId, "Payment verified", "Your payment is verified. Collection information is now available.");
  revalidatePath("/seller/orders");
  revalidatePath("/seller/finance");
}

export async function completeOrder(formData: FormData): Promise<void> {
  const me = await seller();
  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findFirst({ where: { id: orderId, sellerId: me.id } });
  if (!order || order.status !== "READY_FOR_COLLECTION") return;
  await prisma.order.update({ where: { id: orderId }, data: { status: "COMPLETED" } });
  await notify(order.customerId, "Order completed", "Your order has been marked complete. Thank you.");
  revalidatePath("/seller/orders");
}

// --- Level policy acknowledgement (§6, §28) ---------------------------------
export async function acknowledgePolicy(formData: FormData): Promise<void> {
  const me = await seller();
  const policyId = String(formData.get("policyId") ?? "");
  const version = Number(formData.get("version")) || 1;
  const policy = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!policy) return;
  await prisma.policyAcknowledgement.upsert({
    where: { policyId_userId_version: { policyId, userId: me.id, version } },
    create: { policyId, userId: me.id, version },
    update: {},
  });
  revalidatePath("/seller/level");
}

// --- Notifications ----------------------------------------------------------
export async function markNotificationsRead(): Promise<void> {
  const me = await seller();
  await prisma.notification.updateMany({ where: { userId: me.id, read: false }, data: { read: true } });
  revalidatePath("/seller/notifications");
}
