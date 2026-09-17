"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashSecret } from "@/lib/password";
import { createSession } from "@/lib/session";
import { loadInvitation } from "@/lib/invitations";
import { notify } from "@/lib/notify";
import { homeForRole } from "@/lib/auth";

export interface RegisterState {
  error?: string;
}

export async function registerAction(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const recovery = String(formData.get("recovery") ?? "");

  const { invitation, reason } = await loadInvitation(token);
  if (!invitation || reason) {
    return { error: reason ?? "Invalid invitation." };
  }
  if (!name || !email || !password) {
    return { error: "Name, email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (invitation.type === "SELLER" && recovery.length < 6) {
    return { error: "A recovery credential (min 6 chars) is required for sellers." };
  }

  // Uniqueness checks
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
  });
  if (existing) {
    return { error: "An account with that email or phone already exists." };
  }

  const isSeller = invitation.type === "SELLER";

  try {
    const user = await prisma.$transaction(async (tx) => {
      // Re-check invitation inside the transaction to keep it one-time-use.
      const fresh = await tx.invitation.findUnique({ where: { id: invitation.id } });
      if (!fresh || fresh.status !== "ACTIVE") {
        throw new Error("This invitation is no longer available.");
      }

      const created = await tx.user.create({
        data: {
          role: isSeller ? "SELLER" : "CUSTOMER",
          name,
          email,
          phone: phone || null,
          passwordHash: await hashSecret(password),
          recoveryHash: isSeller ? await hashSecret(recovery) : null,
          // Sellers are pending payment/approval; customers await seller approval.
          status: "PENDING",
          levelId: isSeller ? fresh.levelId : null,
          masterId: fresh.createdById,
        },
      });

      await tx.invitation.update({
        where: { id: fresh.id },
        data: { status: "USED", usedAt: new Date() },
      });

      return created;
    });

    // Notify the inviter (master seller / admin) of the new application.
    await notify(
      invitation.createdById,
      isSeller ? "New seller registration" : "New customer application",
      `${name} (${email}) has registered and is awaiting your approval.`
    );

    await createSession({ uid: user.id, role: user.role, name: user.name });
    redirect(homeForRole(user.role));
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
    return {
      error:
        err instanceof Error ? err.message : "Could not complete registration. Try again.",
    };
  }
  return {};
}
