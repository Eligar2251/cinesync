// app/room/create/page-client.tsx
'use client'

import { useState, useCallback, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Globe, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/UI/Button/Button'
import { Input } from '@/components/UI/Input/Input'
import styles from './create.module.css'

const EASING = [0.25, 0.46, 0.45, 0.94] as const

export function CreateRoomPageClient() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const kpId       = searchParams.get('kpId') ?? ''
  const movieTitle = searchParams.get('title') ?? ''
  const poster     = searchParams.get('poster') ?? ''

  const [title, setTitle]       = useState(movieTitle || '')
  const [isPublic, setIsPublic] = useState(true)
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (title.trim().length < 2) {
        setError('Название слишком короткое')
        return
      }
      if (!isPublic && password.length > 0 && password.length < 4) {
        setError('Пароль должен быть не менее 4 символов')
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            isPublic,
            password: !isPublic ? password : undefined,
            kpId: kpId || undefined,
            movieTitle: movieTitle || undefined,
            posterUrl: poster || undefined,
          }),
        })

        const data = await res.json() as { room?: { slug: string }; error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Ошибка создания')

        router.push(`/room/${data.room!.slug}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
        setIsLoading(false)
      }
    },
    [title, isPublic, password, kpId, movieTitle, poster, router]
  )

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.container}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASING }}
      >
        <Link href="/search" className={styles.back}>
          <ChevronLeft size={16} strokeWidth={1.5} />
          Назад
        </Link>

        <h1 className={styles.heading}>Новая комната</h1>

        {poster && (
          <div className={styles.moviePreview}>
            <div className={styles.moviePoster}>
              <Image
                src={decodeURIComponent(poster)}
                alt={movieTitle}
                fill
                style={{ objectFit: 'cover' }}
                sizes="80px"
              />
            </div>
            <div className={styles.movieMeta}>
              <p className={styles.movieLabel}>Выбранный фильм</p>
              <p className={styles.movieName}>{decodeURIComponent(movieTitle)}</p>
            </div>
          </div>
        )}

        {error && (
          <motion.div
            className={styles.errorBanner}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Название комнаты"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Вечер с Нолан"
            autoFocus={!movieTitle}
          />

          <div className={styles.fieldGroup}>
            <p className={styles.fieldLabel}>Доступ</p>
            <div className={styles.toggleRow}>
              <button
                type="button"
                className={styles.toggleBtn}
                data-active={isPublic}
                onClick={() => setIsPublic(true)}
              >
                <Globe size={14} strokeWidth={1.5} />
                Публичная
              </button>
              <button
                type="button"
                className={styles.toggleBtn}
                data-active={!isPublic}
                onClick={() => setIsPublic(false)}
              >
                <Lock size={14} strokeWidth={1.5} />
                Приватная
              </button>
            </div>
          </div>

          {!isPublic && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: EASING }}
            >
              <Input
                label="Пароль (необязательно)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 4 символа"
                hint="Оставьте пустым, если пароль не нужен"
              />
            </motion.div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
          >
            Создать комнату
          </Button>
        </form>
      </motion.div>
    </div>
  )
}