import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow auth routes and login page
  if (pathname.startsWith('/api/auth') || pathname === '/login') {
    return NextResponse.next();
  }

  // If LDAP enforcement is not enabled, allow all requests
  if (process.env.LDAP_ENABLED !== 'true') {
    return NextResponse.next();
  }

  // API key bypass — allows programmatic access without LDAP
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    const authHeader = req.headers.get('authorization') ?? '';
    const keyHeader  = req.headers.get('x-api-key') ?? '';
    if (authHeader === `Bearer ${apiKey}` || keyHeader === apiKey) {
      return NextResponse.next();
    }
  }

  // LDAP is enabled — require a valid session
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) return NextResponse.next();
  } catch {
    // getToken failure (e.g. missing secret) → treat as unauthenticated
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('callbackUrl', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
