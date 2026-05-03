// app/api/rooms/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'
import { getSessionFromCookies } from '@/lib/auth'
import { pool } from '@/lib/db'

interface RoomRow {
  id:         string
  slug:       string
  title:      string
  host_id:    string
  is_public:  boolean
  kp_id:      string | null
  movie_title: string | null
  poster_url:  string | null
}

function roomRowToResponse(room: RoomRow) {
  return {
    id:         room.id,
    slug:       room.slug,
    title:      room.title,
    hostId:     room.host_id,
    isPublic:   room.is_public,
    kpId:       room.kp_id,
    movieTitle: room.movie_title,
    posterUrl:  room.poster_url,
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      title,
      isPublic = true,
      password,
      kpId,
      movieTitle,
      posterUrl,
    } = body as {
      title?:      string
      isPublic?:   boolean
      password?:   string
      kpId?:       string
      movieTitle?: string
      posterUrl?:  string
    }

    if (!title || title.trim().length < 2) {
      return NextResponse.json({ error: 'Слишком короткое название' }, { status: 400 })
    }

    const slug = nanoid(8)
    let passwordHash: string | null = null

    if (!isPublic && password && password.length >= 4) {
      passwordHash = await bcrypt.hash(password, 8)
    }

    const client = await pool.connect()
    try {
      const result = await client.query<RoomRow>(
        `INSERT INTO rooms
           (slug, title, host_id, is_public, password_hash, kp_id, movie_title, poster_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id, slug, title, host_id, is_public, kp_id, movie_title, poster_url`,
        [
          slug,
          title.trim(),
          session.sub,
          isPublic,
          passwordHash,
          kpId       ?? null,
          movieTitle ?? null,
          posterUrl  ?? null,
        ]
      )

      const room = result.rows[0]
      if (!room) {
        return NextResponse.json({ error: 'Ошибка создания комнаты' }, { status: 500 })
      }

      return NextResponse.json({ room: roomRowToResponse(room) }, { status: 201 })
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('[rooms/post]', err)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'slug обязателен' }, { status: 400 })
  }

  try {
    const client = await pool.connect()
    try {
      const result = await client.query<RoomRow>(
        `SELECT id, slug, title, host_id, is_public, kp_id, movie_title, poster_url
         FROM rooms
         WHERE slug = $1
         LIMIT 1`,
        [slug]
      )

      const room = result.rows[0]
      if (!room) {
        return NextResponse.json({ error: 'Комната не найдена' }, { status: 404 })
      }

      return NextResponse.json({ room: roomRowToResponse(room) })
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('[rooms/get]', err)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}