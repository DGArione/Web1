import Link from "next/link";
import { NavLink } from "./NavLink";

export interface NavItem {
  href: string;
  label: string;
}

export function DashboardShell({
  brand,
  roleLabel,
  userName,
  nav,
  children,
}: {
  brand: string;
  roleLabel: string;
  userName: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="dark min-h-screen bg-tea-950 text-tea-50">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-tea-800/60 bg-tea-900/40 p-4 md:flex">
          <Link href="/" className="mb-6 flex items-center gap-2 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-tea-700 font-serif text-sm text-white">
              C
            </div>
            <span className="font-serif text-sm font-semibold">{brand}</span>
          </Link>
          <span className="mb-2 px-3 text-xs uppercase tracking-wide text-tea-500">
            {roleLabel}
          </span>
          <nav className="flex-1 space-y-1">
            {nav.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>
          <form action="/logout" method="post" className="mt-4">
            <button type="submit" className="btn-ghost w-full text-tea-300">
              Sign out
            </button>
          </form>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-tea-800/60 bg-tea-900/30 px-6 py-4">
            <div className="md:hidden">
              <span className="font-serif text-sm font-semibold">{brand}</span>
            </div>
            <div className="ml-auto flex items-center gap-3 text-sm">
              <span className="text-tea-300">{userName}</span>
              <span className="badge bg-tea-700 text-tea-50">{roleLabel}</span>
            </div>
          </header>

          {/* Mobile nav */}
          <nav className="flex gap-1 overflow-x-auto border-b border-tea-800/60 px-4 py-2 md:hidden">
            {nav.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>

          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-tea-50">{title}</h1>
        {description && <p className="mt-1 text-sm text-tea-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
