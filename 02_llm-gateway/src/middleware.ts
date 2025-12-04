import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Get session from cookies
  const session = await getIronSession<SessionData>(request.cookies as never, sessionOptions)

  const isLoggedIn = session.isLoggedIn
  const pathname = request.nextUrl.pathname

  // Protected routes
  if (pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }
  }

  // Redirect logged in users away from auth pages
  if (pathname.startsWith('/auth/') && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}
