// app/room/[slug]/page.tsx  (updated section — full file)
'use client'

import { useEffect, useState, use, useCallback } from 'react'
import { useRouter }    from 'next/navigation'
import { motion }       from 'framer-motion'
import { RoomLayout }   from '@/components/Room/RoomLayout'
import { useRoomSync }  from '@/lib/useRoomSync'
import { Input }        from '@/components/UI/Input/Input'
import { Button }       from '@/components/UI/Button/Button'
import { useRoomStore } from '@/store/room.store'
import { useUserStore } from '@/store/user.store'
import styles           from './room.module.css'

interface PageProps {
  params: Promise<{ slug: string }>
}

type RoomStatus = 'loading' | 'password' | 'ready' | 'notfound'

const EASING = [0.25, 0.46, 0.45, 0.94] as const

interface RoomData {
  id: string; slug: string; title: string; hostId: string
  isPublic: boolean; kpId: string | null; movieTitle: string | null; posterUrl: string | null
}

function RoomReady({ slug, hostId }: { slug: string; hostId: string }) {
  // Get token from cookie (client-side readable via document.cookie isn't possible for httpOnly)
  // So we fetch a short-lived WS token from an endpoint
  const [wsToken, setWsToken] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/ws-token')
      .then((r) => r.json())
      .then((d: { token?: string }) => { if (d.token) setWsToken(d.token) })
      .catch(() => {})
  }, [])

  useRoomSync({ slug, hostId, token: wsToken ?? '' })

  if (!wsToken) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
      </div>
    )
  }

  return <RoomLayout slug={slug} />
}

export default function RoomPage({ params }: PageProps) {
  const { slug }    = use(params)
  const router      = useRouter()
  const { user }    = useUserStore()
  const { setRoom } = useRoomStore()

  const [status, setStatus]     = useState<RoomStatus>('loading')
  const [roomData, setRoomData] = useState<RoomData | null>(null)
  const [password, setPassword] = useState('')
  const [pwError, setPwError]   = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    if (!slug) return
    let cancelled = false

    fetch(`/api/rooms?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data: { room?: RoomData; error?: string }) => {
        if (cancelled) return
        if (!data.room) { setStatus('notfound'); return }

        const room = data.room
        if (!room.isPublic && user?.id !== room.hostId) {
          setRoomData(room)
          setStatus('password')
          return
        }
        setRoom(room)
        setRoomData(room)
        setStatus('ready')
      })
      .catch(() => { if (!cancelled) setStatus('notfound') })

    return () => { cancelled = true }
  }, [slug, user?.id, setRoom])

  const handlePasswordSubmit = useCallback(async () => {
    if (!roomData) return
    setIsVerifying(true)
    setPwError('')
    try {
      const res  = await fetch('/api/rooms/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ slug, password }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) { setPwError(data.error ?? 'Неверный пароль'); setIsVerifying(false); return }
      setRoom(roomData)
      setStatus('ready')
    } catch {
      setPwError('Ошибка соединения')
      setIsVerifying(false)
    }
  }, [roomData, slug, password, setRoom])

  if (status === 'loading') {
    return <div className={styles.center}><div className={styles.spinner} /></div>
  }

  if (status === 'notfound') {
    return (
      <div className={styles.center}>
        <motion.div
          className={styles.errorCard}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASING }}
        >
          <span className={styles.errorIcon}>◈</span>
          <h1 className={styles.errorTitle}>Комната не найдена</h1>
          <p className={styles.errorSub}>Возможно, она была удалена или ссылка неверна</p>
          <Button variant="ghost" onClick={() => router.push('/search')}>На главную</Button>
        </motion.div>
      </div>
    )
  }

  if (status === 'password') {
    return (
      <div className={styles.center}>
        <motion.div
          className={styles.passwordCard}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: EASING }}
        >
          <span className={styles.lockIcon}>🔒</span>
          <h1 className={styles.passwordTitle}>Приватная комната</h1>
          <p className={styles.passwordSub}>Введите пароль для входа</p>
          <div className={styles.passwordForm}>
            <Input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={pwError}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit() }}
            />
            <Button variant="primary" fullWidth onClick={handlePasswordSubmit} isLoading={isVerifying}>
              Войти
            </Button>
            <Button variant="text" onClick={() => router.push('/search')}>Отмена</Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return <RoomReady slug={slug} hostId={roomData?.hostId ?? ''} />
}