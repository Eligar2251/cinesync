// app/api/profile/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join }             from 'path'
import { v4 as uuidv4 }    from 'uuid'
import { getSessionFromCookies } from '@/lib/auth'
import { pool }             from '@/lib/db'

const UPLOAD_DIR    = join(process.cwd(), 'public', 'uploads', 'avatars')
const MAX_SIZE      = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const EXT_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
  'image/gif':  '.gif',
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file     = formData.get('avatar') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Недопустимый тип файла' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Файл слишком большой (макс 5 МБ)' }, { status: 400 })
    }

    await mkdir(UPLOAD_DIR, { recursive: true })

    const ext      = EXT_MAP[file.type] ?? '.jpg'
    const filename = `${uuidv4()}${ext}`
    const filepath = join(UPLOAD_DIR, filename)
    const bytes    = await file.arrayBuffer()

    await writeFile(filepath, Buffer.from(bytes))

    const url    = `/uploads/avatars/${filename}`
    const client = await pool.connect()
    try {
      await client.query(
        `UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2`,
        [url, session.sub]
      )
    } finally {
      client.release()
    }

    return NextResponse.json({ url })
  } catch (err) {
    console.error('[avatar/post]', err)
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest) {
  const session = await getSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const client = await pool.connect()
    try {
      await client.query(
        `UPDATE users SET avatar_url = NULL, updated_at = NOW() WHERE id = $1`,
        [session.sub]
      )
    } finally {
      client.release()
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[avatar/delete]', err)
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 })
  }
}