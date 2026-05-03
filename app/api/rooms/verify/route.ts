// app/api/rooms/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { pool } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { slug, password } = (await req.json()) as {
      slug?:     string
      password?: string
    }

    if (!slug) {
      return NextResponse.json({ error: 'slug обязателен' }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      const result = await client.query<{
        id:            string
        password_hash: string | null
        is_public:     boolean
      }>(
        `SELECT id, password_hash, is_public FROM rooms WHERE slug = $1 LIMIT 1`,
        [slug]
      )

      const room = result.rows[0]
      if (!room) {
        return NextResponse.json({ error: 'Комната не найдена' }, { status: 404 })
      }

      if (room.is_public || !room.password_hash) {
        return NextResponse.json({ ok: true })
      }

      if (!password) {
        return NextResponse.json({ error: 'Требуется пароль' }, { status: 403 })
      }

      const match = await bcrypt.compare(password, room.password_hash)
      if (!match) {
        return NextResponse.json({ error: 'Неверный пароль' }, { status: 403 })
      }

      return NextResponse.json({ ok: true })
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('[rooms/verify]', err)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}