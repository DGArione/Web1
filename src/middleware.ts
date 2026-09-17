import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Edge middleware runs BEFORE any route renders, so it is the correct place to
 * enforce authorization. Guarding only inside a layout/page with redirect() is
 * not enough: Next.js still renders the page in parallel and streams its RSC
 * payload (including sensitive data) in the redirect response body. Middleware
 * returns a clean redirect with no body, closing that leak.
 */

const COOKIE_NAME = "mkt_session";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  SELLER: "/seller",
  CUSTOMER: "/customer",
};

// Path prefix -> role allowed to access it.
const GUARDS: { prefix: string; role: string }[] = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/seller", role: "SELLER" },
  { prefix: "/customer", role: "CUSTOMER" },
];

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const guard = GUARDS.find((g) => pathname === g.prefix || pathname.startsWith(g.prefix + "/"));
  if (!guard) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const loginUrl = new URL("/login", req.url);

  if (!token) return NextResponse.redirect(loginUrl);

  try {
    const { payload } = await jwtVerify(token, secret());
    const role = String(payload.role ?? "");
    if (role !== guard.role) {
      // Logged in but wrong area — send to the caller's own home.
      const home = ROLE_HOME[role];
      return NextResponse.redirect(new URL(home ?? "/login", req.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  // Run on the protected areas only.
  matcher: ["/admin/:path*", "/seller/:path*", "/customer/:path*"],
};
