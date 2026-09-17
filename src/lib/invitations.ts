import { prisma } from "./db";
import type { Invitation } from "@prisma/client";

/**
 * Load an invitation by token and normalise its status. A one-time link is
 * valid only while ACTIVE and not past expiry (proposal §9, §10). Expired links
 * are lazily marked EXPIRED on read.
 */
export async function loadInvitation(token: string): Promise<{
  invitation: Invitation | null;
  reason?: string;
}> {
  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation) return { invitation: null, reason: "This invitation link is not valid." };

  if (invitation.status === "USED") {
    return { invitation, reason: "This invitation has already been used." };
  }
  if (invitation.status === "REVOKED") {
    return { invitation, reason: "This invitation has been revoked." };
  }
  if (invitation.status === "EXPIRED" || invitation.expiresAt.getTime() < Date.now()) {
    if (invitation.status !== "EXPIRED") {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
    }
    return { invitation, reason: "This invitation has expired." };
  }
  return { invitation };
}
