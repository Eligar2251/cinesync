// app/api/profile/password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSessionFromCookies } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.isGuest) {
    return NextResponse.json({ error: 'Гостям нельзя менять пароль' }, { status: 403 })
  }

  const { currentPassword, newPassword } = await req.json() as {
    currentPassword?: string
    newPassword?:     string
  }

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 })
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Минимум 6 символов' }, { status: 400 })
  }

  try {
    const client = await pool.connect()
    try {
      const result = await client.query<{ password_hash: string | null }>(
        `SELECT password_hash FROM users WHERE id = $1 LIMIT 1`,
        [session.sub]
      )

      const user = result.rows[0]
      if (!user?.password_hash) {
        return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
      }

      const match = await bcrypt.compare(currentPassword, user.password_hash)
      if (!match) {
        return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 401 })
      }

      const newHash = await bcrypt.hash(newPassword, 10)
      await client.query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [newHash, session.sub]
      )

      return NextResponse.json({ ok: true })
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('[profile/password]', err)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}