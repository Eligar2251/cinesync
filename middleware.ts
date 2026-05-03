// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fjsaoffdsfi12kdfjas8890afj1212df'
)

const PROTECTED_ROUTES = ['/room', '/profile']
const AUTH_ROUTES = ['/login', '/register']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  const isProtected = PROTECTED_ROUTES.some(r => pathname.startsWith(r))
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r))
  const token = req.cookies.get('access_token')?.value

  let isAuthenticated = false

  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET)
      isAuthenticated = true
    } catch (e) {
      isAuthenticated = false
    }
  }

  // 1. Если пытаемся зайти в комнату без токена
  if (isProtected && !isAuthenticated) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // 2. Если мы залогинены и пытаемся зайти на страницу логина/реги
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/search', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/room/:path*', '/profile/:path*', '/login', '/register'],
}