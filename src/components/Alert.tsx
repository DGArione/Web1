export function Alert({
  kind = "error",
  children,
}: {
  kind?: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  if (!children) return null;
  const styles = {
    error: "bg-red-500/15 text-red-300 border-red-500/30",
    success: "bg-tea-500/15 text-tea-200 border-tea-500/30",
    info: "bg-gold-500/15 text-gold-400 border-gold-500/30",
  }[kind];
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${styles}`}>{children}</div>
  );
}
