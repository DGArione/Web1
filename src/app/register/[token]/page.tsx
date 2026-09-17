import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { Alert } from "@/components/Alert";
import { loadInvitation } from "@/lib/invitations";
import { prisma } from "@/lib/db";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { invitation, reason } = await loadInvitation(token);

  if (!invitation || reason) {
    return (
      <AuthShell title="Invitation">
        <Alert kind="error">{reason ?? "This invitation link is not valid."}</Alert>
        <Link href="/" className="btn-ghost mt-6 w-full">
          Back to home
        </Link>
      </AuthShell>
    );
  }

  const isSeller = invitation.type === "SELLER";
  const inviter = await prisma.user.findUnique({
    where: { id: invitation.createdById },
    select: { name: true },
  });
  const level = invitation.levelId
    ? await prisma.sellerLevel.findUnique({ where: { id: invitation.levelId } })
    : null;

  return (
    <AuthShell
      title={isSeller ? "Seller registration" : "Customer registration"}
      subtitle={
        isSeller
          ? `You've been invited to join${level ? ` at the ${level.name} level` : ""} by ${inviter?.name ?? "an administrator"}.`
          : `You've been invited by ${inviter?.name ?? "your seller"}.`
      }
    >
      <RegisterForm token={token} isSeller={isSeller} />
      <p className="mt-6 text-center text-xs text-tea-400">
        Your account will be reviewed and activated after registration
        {isSeller ? " and payment of any registration fee." : "."}
      </p>
    </AuthShell>
  );
}
