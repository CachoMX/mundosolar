import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase environment variables not configured')
    // Allow access to login page, redirect everything else to login
    if (!req.nextUrl.pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/cambiar-contrasenia', '/cliente']
  const isPublicRoute = publicRoutes.some(route => req.nextUrl.pathname.startsWith(route))

  // Check for client token (for client authentication)
  const clientToken = req.cookies.get('client-token')?.value

  // If no session and no client token, and trying to access protected route, redirect to login
  if (!session && !clientToken && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // If has session and trying to access login, redirect to dashboard
  if (session && req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets (public assets like logos, images)
     * - icons (PWA icons)
     * - manifest.json, sw.js, offline.html (PWA files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|assets|icons|manifest.json|sw.js|offline.html).*)',
  ],
}
