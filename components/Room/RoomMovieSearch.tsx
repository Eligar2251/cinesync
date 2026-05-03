// components/Room/RoomMovieSearch.tsx
'use client'

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  memo,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Star, Film } from 'lucide-react'
import { useRoomStore } from '@/store/room.store'
import { wsClient } from '@/lib/ws-client'
import { PROVIDERS } from '@/lib/providers.config'
import type { KPFilm } from '@/lib/kp.types'
import styles from './RoomMovieSearch.module.css'

const EASING = [0.25, 0.46, 0.45, 0.94] as const
const DEBOUNCE_MS = 400

interface MovieResultProps {
  film: KPFilm
  onSelect: (film: KPFilm) => void
}

const MovieResult = memo(function MovieResult({ film, onSelect }: MovieResultProps) {
  const title  = film.nameRu ?? film.nameEn ?? film.nameOriginal ?? 'Без названия'
  const rating = film.ratingKinopoisk ?? film.ratingImdb

  const [imgError, setImgError] = useState(false)

  return (
    <button
      className={styles.result}
      onClick={() => onSelect(film)}
      type="button"
    >
      <div className={styles.resultPoster}>
        {!imgError && (film.posterUrlPreview || film.posterUrl) ? (
          <Image
            src={film.posterUrlPreview || film.posterUrl}
            alt={title}
            fill
            sizes="44px"
            style={{ objectFit: 'cover' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.resultPosterFallback}>
            <Film size={14} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className={styles.resultInfo}>
        <span className={styles.resultTitle}>{title}</span>
        <div className={styles.resultMeta}>
          {film.year && (
            <span className={styles.resultYear}>{film.year}</span>
          )}
          {rating && (
            <span className={styles.resultRating}>
              <Star size={9} strokeWidth={2} fill="currentColor" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </button>
  )
})

interface RoomMovieSearchProps {
  isHost: boolean
  onClose: () => void
}

export const RoomMovieSearch = memo(function RoomMovieSearch({
  isHost,
  onClose,
}: RoomMovieSearchProps) {
  const { room, setRoom, setPlayerState } = useRoomStore()

  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<KPFilm[]>([])
  const [isLoading, setLoading] = useState(false)
  const [error, setError]       = useState('')
  const inputRef                = useRef<HTMLInputElement>(null)
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json() as { films?: KPFilm[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Ошибка поиска')
      setResults(data.films ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(q), DEBOUNCE_MS)
  }, [doSearch])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Enter') {
      if (timerRef.current) clearTimeout(timerRef.current)
      doSearch(query)
    }
  }, [onClose, doSearch, query])

  const handleClear = useCallback(() => {
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }, [])

  const handleSelectFilm = useCallback(async (film: KPFilm) => {
    if (!isHost || !room) return

    const title = film.nameRu ?? film.nameEn ?? film.nameOriginal ?? ''

    try {
      // Обновляем комнату в БД
      await fetch(`/api/rooms/${room.slug}/movie`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          kpId:       String(film.kinopoiskId),
          movieTitle: title,
          posterUrl:  film.posterUrlPreview || film.posterUrl,
        }),
      })
    } catch {
      // best-effort — даже если не сохранилось, меняем локально
    }

    // Обновляем стор
    setRoom({
      ...room,
      kpId:       String(film.kinopoiskId),
      movieTitle: title,
      posterUrl:  film.posterUrlPreview || film.posterUrl,
    })

    // Сбрасываем плеер на начало
    setPlayerState({
      currentTime: 0,
      isPlaying:   false,
      provider:    PROVIDERS[0]?.id ?? 'alloha',
    })

    // Сообщаем всем в комнате через WS
    wsClient.send({
      type: 'CHANGE_MOVIE',
      payload: {
        kpId:       String(film.kinopoiskId),
        movieTitle: title,
        posterUrl:  film.posterUrlPreview || film.posterUrl,
        provider:   PROVIDERS[0]?.id ?? 'alloha',
      },
    })

    onClose()
  }, [isHost, room, setRoom, setPlayerState, onClose])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <motion.div
      className={styles.panel}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: EASING }}
    >
      {/* Search input */}
      <div className={styles.inputWrap}>
        <Search size={15} strokeWidth={1.5} className={styles.searchIcon} />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Найти фильм..."
          className={styles.input}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button className={styles.clearBtn} onClick={handleClear} type="button">
            <X size={13} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Results */}
      <div className={styles.results}>
        {isLoading && (
          <div className={styles.state}>
            <div className={styles.spinner} />
            <span>Поиск...</span>
          </div>
        )}

        {error && !isLoading && (
          <div className={styles.state}>
            <span className={styles.errorText}>{error}</span>
          </div>
        )}

        {!isLoading && !error && query.length >= 2 && results.length === 0 && (
          <div className={styles.state}>
            <span className={styles.emptyText}>Ничего не найдено</span>
          </div>
        )}

        {!isLoading && results.map((film) => (
          <MovieResult
            key={film.kinopoiskId}
            film={film}
            onSelect={handleSelectFilm}
          />
        ))}
      </div>

      {!isHost && (
        <div className={styles.hostOnly}>
          Только хост может менять фильм
        </div>
      )}
    </motion.div>
  )
})