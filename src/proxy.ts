import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-key-change-in-prod"
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('session_token')?.value;

  // 1. Guarding Protected Routes (e.g., /dashboard)
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      // No token? Kick them back to the root landing/login page
      return NextResponse.redirect(new URL('/', request.url));
    }

    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch (error) {
      console.warn("⚠️ Guard Proxy rejected invalid token, redirecting to root...");
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('session_token');
      return response;
    }
  }

  // 2. Root Page Gateway (pathname === '/')
  if (pathname === '/') {
    if (token) {
      try {
        // Verify token is valid before doing anything
        await jwtVerify(token, JWT_SECRET);
        // User is already logged in -> bypass the login form and slide them into the dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } catch {
        // Token is corrupted/expired -> let them stay on '/' to log in again, but clear the bad cookie
        const response = NextResponse.next();
        response.cookies.delete('session_token');
        return response;
      }
    }
  }

  return NextResponse.next();
}

// Cleaned up the matcher to only intercept the root and dashboard routes
export const config = {
  matcher: ['/', '/dashboard/:path*'],
};