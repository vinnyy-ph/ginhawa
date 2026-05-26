import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  const isAuthRoute = pathname === '/login' || pathname === '/signup' || pathname === '/signup/doctor';

  if (isAuthRoute) {
    if (token) {
      return NextResponse.redirect(new URL(token.role === 'DOCTOR' ? '/doctor/dashboard' : '/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // Public routes
  if (
    pathname === '/' ||
    pathname === '/for-doctors' ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  // Not authenticated
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const role = token.role;

  // Doctor-only routes
  const isDoctorRoute = pathname === '/doctor/dashboard' || pathname.startsWith('/doctor/');
  
  // Patient-only routes
  const isPatientRoute = 
    pathname === '/dashboard' || 
    pathname.startsWith('/dashboard/') || 
    pathname.startsWith('/onboarding/') || 
    pathname.startsWith('/book/') || 
    pathname === '/doctors' || 
    pathname.startsWith('/doctors/') || 
    pathname.startsWith('/recommendations');

  if (role === 'PATIENT' && isDoctorRoute) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (role === 'DOCTOR' && isPatientRoute) {
    return NextResponse.redirect(new URL('/doctor/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
