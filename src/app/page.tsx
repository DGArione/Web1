import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-tea-50 to-tea-100 text-tea-950">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tea-700 text-lg font-serif text-white">
            C
          </div>
          <span className="font-serif text-xl font-semibold tracking-tight text-tea-900">
            Ceylon Private Traders
          </span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/apply" className="text-sm font-medium text-tea-700 hover:text-tea-900">
            Become a Seller
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-tea-700 px-4 py-2 text-sm font-medium text-white hover:bg-tea-800"
          >
            Member Login
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <span className="badge bg-gold-500/20 text-tea-800">Invitation only</span>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-tea-950 md:text-5xl">
              A private marketplace, cultivated like fine Ceylon tea.
            </h1>
            <p className="mt-5 max-w-md text-lg text-tea-800/90">
              Ceylon Private Traders is a members-only buy &amp; sell network. Access is
              granted by invitation through trusted sellers — never by public sign-up.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/apply" className="rounded-md bg-tea-700 px-6 py-3 text-sm font-semibold text-white hover:bg-tea-800">
                Request seller access
              </Link>
              <Link href="/login" className="rounded-md border border-tea-300 bg-white px-6 py-3 text-sm font-semibold text-tea-800 hover:bg-tea-50">
                I have an account
              </Link>
            </div>
            <p className="mt-4 text-xs text-tea-700/70">
              Have an invitation link? Open it to register.
            </p>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-tea-600 via-tea-700 to-tea-900 shadow-2xl">
              <div className="flex h-full flex-col justify-end p-8 text-white">
                <div className="mb-2 h-1 w-16 rounded bg-gold-400" />
                <p className="font-serif text-2xl">Highland Estate Selection</p>
                <p className="mt-1 text-sm text-tea-100/80">
                  Curated goods, trusted network, discreet transactions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="border-t border-tea-200 bg-white/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-3">
          {[
            {
              title: "Invitation-only network",
              body: "Sellers and customers join through one-time, expiring invitation links. No public registration, ever.",
            },
            {
              title: "Trusted seller tiers",
              body: "A configurable hierarchy of seller levels with their own commissions, permissions and policies.",
            },
            {
              title: "Discreet by design",
              body: "Sensitive transaction details are shown temporarily and expire automatically for privacy.",
            },
          ].map((f) => (
            <div key={f.title}>
              <div className="mb-3 h-1 w-10 rounded bg-gold-500" />
              <h3 className="font-serif text-lg font-semibold text-tea-900">{f.title}</h3>
              <p className="mt-2 text-sm text-tea-700">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h2 className="font-serif text-3xl font-bold text-tea-950">
          Interested in joining as a seller?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-tea-700">
          Submit a request and our administrators will review it. Approved applicants
          receive a private, one-time registration invitation.
        </p>
        <Link
          href="/apply"
          className="mt-6 inline-block rounded-md bg-gold-500 px-8 py-3 text-sm font-semibold text-tea-950 hover:bg-gold-400"
        >
          Submit a seller request
        </Link>
      </section>

      <footer className="border-t border-tea-200 bg-tea-900 py-8 text-center text-sm text-tea-200">
        <p>© {new Date().getFullYear()} Ceylon Private Traders. Private &amp; confidential.</p>
      </footer>
    </main>
  );
}
