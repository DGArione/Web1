"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifySecret } from "@/lib/password";
import { createSession } from "@/lib/session";
import { homeForRole } from "@/lib/auth";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Enter your email/phone and password." };
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { phone: identifier }],
    },
  });

  if (!user || !(await verifySecret(password, user.passwordHash))) {
    return { error: "Invalid credentials." };
  }

  if (user.status === "DISABLED") {
    return { error: "This account has been disabled. Contact your administrator." };
  }
  if (user.status === "INACTIVE") {
    return {
      error:
        "This account is inactive. Please request reactivation from your master seller or administrator.",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

  await createSession({ uid: user.id, role: user.role, name: user.name });
  redirect(homeForRole(user.role));
}
