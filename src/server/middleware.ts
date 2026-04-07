import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicRoutes = [
    '/login',
    '/api/auth',
    '/api/auth/',
    '/api/auth/signin',
    '/api/auth/signout',
    '/api/auth/session',
  ];

  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('next-auth.session-token')?.value
    || request.cookies.get('__Secure-next-auth.session-token')?.value;

  if (!authCookie && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
