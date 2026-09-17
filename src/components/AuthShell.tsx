import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="dark flex min-h-screen items-center justify-center bg-tea-950 px-4 py-10 text-tea-50">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tea-700 font-serif text-white">
            C
          </div>
          <span className="font-serif text-lg font-semibold text-tea-50">
            Ceylon Private Traders
          </span>
        </Link>
        <div className="card">
          <h1 className="font-serif text-2xl font-semibold text-tea-50">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-tea-300">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
