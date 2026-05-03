// components/Search/MovieActionModal.tsx
'use client'

import { useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Play, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { KPFilm } from '@/lib/kp.types'
import { Button } from '@/components/UI/Button/Button'
import styles from './MovieActionModal.module.css'

interface MovieActionModalProps {
  film: KPFilm | null
  onClose: () => void
}

const EASING = [0.25, 0.46, 0.45, 0.94] as const

export function MovieActionModal({ film, onClose }: MovieActionModalProps) {
  const router  = useRouter()

  const handleCreateRoom = useCallback(() => {
    if (!film) return
    router.push(
      `/room/create?kpId=${film.kinopoiskId}&title=${encodeURIComponent(
        film.nameRu ?? film.nameEn ?? ''
      )}&poster=${encodeURIComponent(film.posterUrlPreview)}`
    )
    onClose()
  }, [film, router, onClose])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose() },
    [onClose]
  )

  const title   = film ? (film.nameRu ?? film.nameEn ?? film.nameOriginal ?? '') : ''
  const rating  = film ? (film.ratingKinopoisk ?? film.ratingImdb) : null

  return (
    <AnimatePresence>
      {film && (
        <motion.div
          className={styles.backdrop}
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.25, ease: EASING }}
            role="dialog"
            aria-modal="true"
            aria-label={`Действия с фильмом ${title}`}
          >
            <button className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
              <X size={16} strokeWidth={1.5} />
            </button>

            <div className={styles.content}>
              {/* Poster */}
              <div className={styles.poster}>
                <Image
                  src={film.posterUrlPreview || film.posterUrl}
                  alt={title}
                  fill
                  sizes="120px"
                  style={{ objectFit: 'cover' }}
                />
              </div>

              {/* Info */}
              <div className={styles.info}>
                <h2 className={styles.title}>{title}</h2>

                <div className={styles.meta}>
                  {film.year && <span className={styles.metaItem}>{film.year}</span>}
                  {film.genres[0] && (
                    <span className={styles.metaItem}>{film.genres[0].genre}</span>
                  )}
                  {rating && (
                    <span className={styles.metaRating}>
                      <Star size={11} strokeWidth={2} fill="currentColor" />
                      {rating.toFixed(1)}
                    </span>
                  )}
                </div>

                <p className={styles.prompt}>
                  Что вы хотите сделать с этим фильмом?
                </p>

                <div className={styles.actions}>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleCreateRoom}
                    fullWidth
                  >
                    <Plus size={15} strokeWidth={1.5} />
                    Создать комнату
                  </Button>
                  <Button variant="ghost" size="md" fullWidth onClick={onClose}>
                    <Play size={15} strokeWidth={1.5} />
                    Выбрать провайдера
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}