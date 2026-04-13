import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow auth routes
  if (pathname.startsWith('/api/auth') || pathname === '/login') {
    return NextResponse.next();
  }

  // Check LDAP enabled via a lightweight API check
  // We read the cookie-based JWT token to know if logged in
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // If no token and not a public path, check if LDAP is required
  if (!token) {
    // Ask the config API — but we can't call internal APIs from middleware easily.
    // Instead, we use a special header set by the app startup or a separate env var.
    // Simplest approach: if LDAP_ENABLED env var is set, enforce auth.
    if (process.env.LDAP_ENABLED === 'true') {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
