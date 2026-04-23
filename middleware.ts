import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authSession = request.cookies.get('auth');
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');

  if (!authSession && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (authSession) {
    try {
      const user = JSON.parse(authSession.value);
      const isAdminRoute = request.nextUrl.pathname.startsWith('/dashboard') || 
                           request.nextUrl.pathname.startsWith('/vendors') || 
                           request.nextUrl.pathname.startsWith('/loans');
      const isVendorRoute = request.nextUrl.pathname.startsWith('/portal');

      if (isAdminRoute && user.role !== 'admin') {
        return NextResponse.redirect(new URL('/portal', request.url));
      }

      if (isVendorRoute && user.role !== 'vendor') {
         return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      
      // If logged in and try to hit '/' or '/login', redirect to proper home
      if (request.nextUrl.pathname === '/' || isLoginPage) {
        if (user.role === 'admin') return NextResponse.redirect(new URL('/dashboard', request.url));
        if (user.role === 'vendor') return NextResponse.redirect(new URL('/portal', request.url));
      }

    } catch (e) {
      // In case the cookie is somehow messed up
      request.cookies.delete('auth');
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
