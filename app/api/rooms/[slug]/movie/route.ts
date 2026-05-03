// app/api/rooms/[slug]/movie/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookies }     from '@/lib/auth'
import { pool }                      from '@/lib/db'

export async function PATCH(
  req:     NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const session = await getSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await context.params
  const { kpId, movieTitle, posterUrl } = await req.json() as {
    kpId?:       string
    movieTitle?: string
    posterUrl?:  string
  }

  if (!kpId) {
    return NextResponse.json({ error: 'kpId обязателен' }, { status: 400 })
  }

  try {
    const client = await pool.connect()
    try {
      // Проверяем что пользователь — хост этой комнаты
      const check = await client.query<{ host_id: string }>(
        `SELECT host_id FROM rooms WHERE slug = $1 LIMIT 1`,
        [slug]
      )
      const room = check.rows[0]
      if (!room) {
        return NextResponse.json({ error: 'Комната не найдена' }, { status: 404 })
      }
      if (room.host_id !== session.sub) {
        return NextResponse.json({ error: 'Только хост может менять фильм' }, { status: 403 })
      }

      await client.query(
        `UPDATE rooms
         SET kp_id = $1, movie_title = $2, poster_url = $3, updated_at = NOW()
         WHERE slug = $4`,
        [kpId, movieTitle ?? null, posterUrl ?? null, slug]
      )

      // Сбрасываем состояние плеера
      await client.query(
        `UPDATE room_player_state
         SET current_time_ms = 0, is_playing = false, updated_at = NOW()
         WHERE room_id = (SELECT id FROM rooms WHERE slug = $1)`,
        [slug]
      )

      return NextResponse.json({ ok: true })
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('[rooms/movie]', err)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}