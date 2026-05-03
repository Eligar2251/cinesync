// app/api/auth/ws-token/route.ts
import { NextResponse }               from 'next/server'
import { getSessionFromCookies, signAccessToken } from '@/lib/auth'

// Issues a short-lived token readable by WS server
// The access_token cookie is httpOnly so the client can't read it directly
// We re-sign a fresh token per WS connection request
export async function GET() {
  const session = await getSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Re-sign with same payload — short expiry for WS use
  const token = await signAccessToken({
    sub:       session.sub,
    username:  session.username,
    email:     session.email,
    chatColor: session.chatColor,
    isGuest:   session.isGuest,
  })

  return NextResponse.json({ token })
}