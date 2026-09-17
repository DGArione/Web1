"use server";

import { prisma } from "@/lib/db";

export interface ApplyState {
  error?: string;
  success?: boolean;
}

export async function applyAction(
  _prev: ApplyState,
  formData: FormData
): Promise<ApplyState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email) {
    return { error: "Name and email are required." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  await prisma.sellerApplication.create({
    data: { name, email, phone: phone || null, message: message || null },
  });

  return { success: true };
}
