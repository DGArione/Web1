"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { saveUpload } from "@/lib/uploads";
import { notify } from "@/lib/notify";

export interface OrderState {
  error?: string;
  success?: string;
}

// --- Place an order (§15) ---------------------------------------------------
export async function placeOrder(_prev: OrderState, formData: FormData): Promise<OrderState> {
  const me = await requireRole("CUSTOMER");
  if (me.status !== "ACTIVE") {
    return { error: "Your account is not active yet. Your seller must approve it first." };
  }
  if (!me.masterId) {
    return { error: "You are not linked to a seller." };
  }
  const productId = String(formData.get("productId") ?? "");
  const quantity = Math.max(1, Number(formData.get("quantity")) || 1);

  const product = await prisma.product.findFirst({
    where: { id: productId, sellerId: me.masterId, active: true },
  });
  if (!product) return { error: "Product not available." };
  if (product.stock < quantity) return { error: "Not enough stock." };

  const total = Math.round(product.price * quantity * 100) / 100;
  const order = await prisma.order.create({
    data: {
      customerId: me.id,
      sellerId: me.masterId,
      total,
      status: "CREATED",
      items: {
        create: { productId: product.id, name: product.name, price: product.price, quantity },
      },
    },
  });
  await notify(me.masterId, "New order received", `${me.name} ordered ${quantity}× ${product.name}.`);

  return { success: `Order placed for ${product.name}. Order #${order.id.slice(0, 8)}.` };
}

// --- Submit payment proof (§16 bank, §17 crypto) ----------------------------
export async function submitPaymentProof(_prev: OrderState, formData: FormData): Promise<OrderState> {
  const me = await requireRole("CUSTOMER");
  const orderId = String(formData.get("orderId") ?? "");
  const method = String(formData.get("method") ?? "");
  const txHash = String(formData.get("txHash") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const file = formData.get("receipt") as File | null;

  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId: me.id },
    include: { payment: true },
  });
  if (!order) return { error: "Order not found." };
  if (order.status !== "AWAITING_PAYMENT" && order.status !== "PROOF_SUBMITTED") {
    return { error: "This order is not awaiting payment." };
  }
  if (method !== "BANK" && method !== "CRYPTO") return { error: "Choose a payment method." };

  let receiptUrl: string | undefined;
  try {
    if (file && file.size > 0) {
      receiptUrl = await saveUpload(file);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }

  if (method === "BANK" && !receiptUrl && !order.payment?.receiptUrl) {
    return { error: "Please upload your bank transfer receipt." };
  }
  if (method === "CRYPTO" && !txHash) {
    return { error: "Please enter the transaction hash." };
  }

  await prisma.payment.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      method: method as "BANK" | "CRYPTO",
      status: "SUBMITTED",
      receiptUrl,
      txHash: method === "CRYPTO" ? txHash : null,
      note: note || null,
    },
    update: {
      method: method as "BANK" | "CRYPTO",
      status: "SUBMITTED",
      ...(receiptUrl ? { receiptUrl } : {}),
      txHash: method === "CRYPTO" ? txHash : null,
      note: note || null,
      verifiedById: null,
      verifiedAt: null,
    },
  });
  await prisma.order.update({ where: { id: order.id }, data: { status: "PROOF_SUBMITTED" } });
  await notify(order.sellerId, "Payment proof submitted", `${me.name} submitted payment proof for an order.`);

  revalidatePath("/customer/orders");
  return { success: "Payment proof submitted. Your seller will verify it." };
}

export async function markNotificationsRead(): Promise<void> {
  const me = await requireRole("CUSTOMER");
  await prisma.notification.updateMany({ where: { userId: me.id, read: false }, data: { read: true } });
  revalidatePath("/customer/notifications");
}
