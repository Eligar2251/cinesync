// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signAccessToken, signRefreshToken, setAuthCookies } from '@/lib/auth'
import { db } from '@/lib/postgrest'

interface LoginUserRow {
  id: string
  username: string
  email: string
  password_hash: string | null
  chat_color: string
  avatar_url: string | null
  is_guest: boolean
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body as {
      email?: string
      password?: string
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Заполните все поля' },
        { status: 400 }
      )
    }

    const rows = await db.post<LoginUserRow[]>(
      'rpc/get_user_for_login',
      {
        p_email: email.toLowerCase(),
      }
    ).catch(() => [] as LoginUserRow[])

    const user = rows[0]

    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    const ok = await bcrypt.compare(password, user.password_hash)

    if (!ok) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    const accessToken = await signAccessToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      chatColor: user.chat_color,
      isGuest: false,
    })

    const refreshToken = await signRefreshToken(user.id)

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        chatColor: user.chat_color,
        avatarUrl: user.avatar_url,
        isGuest: false,
      },
    })

    setAuthCookies(response, accessToken, refreshToken)
    return response
  } catch (err) {
    console.error('[login]', err)

    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}