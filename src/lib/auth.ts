import "server-only";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { prisma } from "./db";
import { getSession } from "./session";

/** Returns the current user record, or null if not logged in / not found. */
export async function currentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  return user;
}

/** Require any logged-in user; redirect to /login otherwise. */
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require a user with one of the given roles; redirect otherwise. */
export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    // Send each role to their own home.
    redirect(homeForRole(user.role));
  }
  return user;
}

export function homeForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "SELLER":
      return "/seller";
    case "CUSTOMER":
      return "/customer";
    default:
      return "/login";
  }
}
