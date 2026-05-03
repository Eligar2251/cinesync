// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import { signAccessToken, signRefreshToken, setAuthCookies } from '@/lib/auth'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body as { email?: string; password?: string }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Заполните все поля' },
        { status: 400 }
      )
    }

    const client = await pool.connect()

    try {
      const result = await client.query<{
        id:            string
        username:      string
        email:         string
        password_hash: string | null
        chat_color:    string
        avatar_url:    string | null
      }>(
        `SELECT id, username, email, password_hash, chat_color, avatar_url
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [email.toLowerCase()]
      )

      const user = result.rows[0]
      if (!user) {
        return NextResponse.json(
          { error: 'Неверный email или пароль' },
          { status: 401 }
        )
      }

      const hash = user.password_hash
      if (!hash) {
        return NextResponse.json(
          { error: 'Неверный email или пароль' },
          { status: 401 }
        )
      }

      const passwordMatch = await bcrypt.compare(password, hash)
      if (!passwordMatch) {
        return NextResponse.json(
          { error: 'Неверный email или пароль' },
          { status: 401 }
        )
      }

      const accessToken  = await signAccessToken({
        sub:       user.id,
        username:  user.username,
        email:     user.email,
        chatColor: user.chat_color,
        isGuest:   false,
      })
      const refreshToken = await signRefreshToken(user.id)

      const response = NextResponse.json({
        user: {
          id:        user.id,
          username:  user.username,
          email:     user.email,
          chatColor: user.chat_color,
          avatarUrl: user.avatar_url,
          isGuest:   false,
        },
      })

      setAuthCookies(response, accessToken, refreshToken)
      return response

    } finally {
      client.release()
    }

  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}