// app/api/auth/guest/route.ts
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { signAccessToken, signRefreshToken, setAuthCookies } from '@/lib/auth'

const GUEST_COLORS = [
  '#7EB8F7', '#A8E6A3', '#F4A0A0',
  '#C3A8F5', '#F5C8A8', '#A8F0F5',
]

const GUEST_NAMES = [
  'Гость', 'Зритель', 'Аноним', 'Наблюдатель',
  'Призрак', 'Тень', 'Незнакомец',
]

export async function POST() {
  try {
    const guestId    = uuidv4()
    const nameBase   = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)]
    const suffix     = Math.floor(Math.random() * 9000) + 1000
    const username   = `${nameBase}#${suffix}`
    const chatColor  = GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)]

    const accessToken  = await signAccessToken({
      sub: guestId,
      username,
      chatColor,
      isGuest: true,
    })
    const refreshToken = await signRefreshToken(guestId)

    const response = NextResponse.json({
      user: {
        id: guestId,
        username,
        email: undefined,
        chatColor,
        avatarUrl: null,
        isGuest: true,
      },
    })

    setAuthCookies(response, accessToken, refreshToken)
    return response
  } catch (err) {
    console.error('[guest]', err)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}