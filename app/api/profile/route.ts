// app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookies, signAccessToken, signRefreshToken, setAuthCookies } from '@/lib/auth'
import { pool } from '@/lib/db'

const VALID_COLORS = [
  '#E8C97A', '#7EB8F7', '#A8E6A3', '#F4A0A0',
  '#C3A8F5', '#F5C8A8', '#A8F0F5', '#F5A8D4',
]

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    username?:  string
    chatColor?: string
  }

  const setClauses: string[]  = []
  const values:     unknown[] = []
  let   idx = 1

  if (body.username !== undefined) {
    const u = body.username.trim()
    if (u.length < 2 || u.length > 32) {
      return NextResponse.json({ error: 'Имя: от 2 до 32 символов' }, { status: 400 })
    }
    setClauses.push(`username = $${idx}`)
    values.push(u)
    idx++
  }

  if (body.chatColor !== undefined) {
    if (!VALID_COLORS.includes(body.chatColor)) {
      return NextResponse.json({ error: 'Недопустимый цвет' }, { status: 400 })
    }
    setClauses.push(`chat_color = $${idx}`)
    values.push(body.chatColor)
    idx++
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 })
  }

  values.push(session.sub)
  const setStr = setClauses.join(', ')

  try {
    const client = await pool.connect()
    try {
      await client.query(
        `UPDATE users SET ${setStr}, updated_at = NOW() WHERE id = $${idx}`,
        values
      )

      // Переиздаём JWT с новыми данными
      const newUsername  = body.username?.trim()  ?? session.username
      const newChatColor = body.chatColor          ?? session.chatColor

      const accessToken  = await signAccessToken({
        sub:       session.sub,
        username:  newUsername,
        email:     session.email,
        chatColor: newChatColor,
        isGuest:   session.isGuest,
      })
      const refreshToken = await signRefreshToken(session.sub)

      const response = NextResponse.json({ ok: true })
      setAuthCookies(response, accessToken, refreshToken)
      return response
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('[profile/patch]', err)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}