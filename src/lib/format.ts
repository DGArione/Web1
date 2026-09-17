export function money(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount ?? 0);
}

export function dateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function relativeExpiry(expiresAt: Date | string | null | undefined): {
  expired: boolean;
  label: string;
} {
  if (!expiresAt) return { expired: false, label: "no expiry" };
  const date = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return { expired: true, label: "expired" };
  const mins = Math.round(ms / 60000);
  if (mins < 60) return { expired: false, label: `expires in ${mins} min` };
  const hours = Math.round(mins / 60);
  if (hours < 48) return { expired: false, label: `expires in ${hours} h` };
  const days = Math.round(hours / 24);
  return { expired: false, label: `expires in ${days} d` };
}
