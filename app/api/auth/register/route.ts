// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { signAccessToken, signRefreshToken, setAuthCookies } from '@/lib/auth'
import { db } from '@/lib/postgrest'

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10)

const CHAT_COLORS = [
  '#E8C97A',
  '#7EB8F7',
  '#A8E6A3',
  '#F4A0A0',
  '#C3A8F5',
  '#F5C8A8',
  '#A8F0F5',
  '#F5A8D4',
]

interface UserRow {
  id: string
  username: string
  email: string
  chat_color: string
  avatar_url: string | null
  is_guest: boolean
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { username, email, password } = body as {
      username?: string
      email?: string
      password?: string
    }

    if (!username || username.trim().length < 2) {
      return NextResponse.json(
        { error: 'Имя пользователя должно содержать минимум 2 символа' },
        { status: 400 }
      )
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Укажите корректный email' },
        { status: 400 }
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase()

    const existing = await db.get<{ id: string }[]>(
      `users?email=eq.${encodeURIComponent(normalizedEmail)}&select=id`
    ).catch(() => [] as { id: string }[])

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Этот email уже зарегистрирован' },
        { status: 409 }
      )
    }

    const userId = uuidv4()
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    const chatColor =
      CHAT_COLORS[Math.floor(Math.random() * CHAT_COLORS.length)] ?? '#E8C97A'

    const insertToken = await signAccessToken({
      sub: userId,
      username: username.trim(),
      email: normalizedEmail,
      chatColor,
      isGuest: false,
    })

    const rows = await db.post<UserRow[]>(
      'users',
      {
        id: userId,
        username: username.trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        chat_color: chatColor,
        avatar_url: null,
        is_guest: false,
      },
      { token: insertToken }
    )

    const newUser = rows[0]

    if (!newUser) {
      return NextResponse.json(
        { error: 'Ошибка создания пользователя' },
        { status: 500 }
      )
    }

    const accessToken = await signAccessToken({
      sub: newUser.id,
      username: newUser.username,
      email: newUser.email,
      chatColor: newUser.chat_color,
      isGuest: false,
    })

    const refreshToken = await signRefreshToken(newUser.id)

    const response = NextResponse.json(
      {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          chatColor: newUser.chat_color,
          avatarUrl: newUser.avatar_url,
          isGuest: false,
        },
      },
      { status: 201 }
    )

    setAuthCookies(response, accessToken, refreshToken)
    return response
  } catch (err) {
    console.error('[register]', err)

    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}