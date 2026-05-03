// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { Pool } from 'pg'
import { signAccessToken, signRefreshToken, setAuthCookies } from '@/lib/auth'

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10)

const CHAT_COLORS = [
  '#E8C97A', '#7EB8F7', '#A8E6A3', '#F4A0A0',
  '#C3A8F5', '#F5C8A8', '#A8F0F5', '#F5A8D4',
]

// Прямое подключение к PostgreSQL — минуя PostgREST и RLS
// Используется только для регистрации, где ещё нет JWT пользователя
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, email, password } = body as {
      username?: string
      email?:    string
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

    const client = await pool.connect()

    try {
      // Проверяем существующего пользователя
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM users WHERE email = $1 LIMIT 1',
        [email.toLowerCase()]
      )

      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: 'Этот email уже зарегистрирован' },
          { status: 409 }
        )
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
      const chatColor    = CHAT_COLORS[Math.floor(Math.random() * CHAT_COLORS.length)] ?? '#E8C97A'
      const userId       = uuidv4()

      // INSERT напрямую через pg — без PostgREST, без RLS
      const result = await client.query<{
        id: string
        username: string
        email: string
        chat_color: string
      }>(
        `INSERT INTO users (id, username, email, password_hash, chat_color, is_guest)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING id, username, email, chat_color`,
        [userId, username.trim(), email.toLowerCase(), passwordHash, chatColor]
      )

      const newUser = result.rows[0]
      if (!newUser) {
        return NextResponse.json(
          { error: 'Ошибка создания пользователя' },
          { status: 500 }
        )
      }

      const accessToken  = await signAccessToken({
        sub:       newUser.id,
        username:  newUser.username,
        email:     newUser.email,
        chatColor: newUser.chat_color,
        isGuest:   false,
      })
      const refreshToken = await signRefreshToken(newUser.id)

      const response = NextResponse.json(
        {
          user: {
            id:        newUser.id,
            username:  newUser.username,
            email:     newUser.email,
            chatColor: newUser.chat_color,
            isGuest:   false,
            avatarUrl: null,
          },
        },
        { status: 201 }
      )

      setAuthCookies(response, accessToken, refreshToken)
      return response

    } finally {
      client.release()
    }

  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}