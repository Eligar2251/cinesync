// components/Search/MovieCard.tsx
'use client'

import { memo, useState, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Star, Calendar } from 'lucide-react'
import type { KPFilm } from '@/lib/kp.types'
import styles from './MovieCard.module.css'

interface MovieCardProps {
  film: KPFilm
  index: number
  onClick: (film: KPFilm) => void
}

const EASING = [0.25, 0.46, 0.45, 0.94] as const

export const MovieCard = memo(function MovieCard({ film, index, onClick }: MovieCardProps) {
  const [imgError, setImgError] = useState(false)

  const title = film.nameRu ?? film.nameEn ?? film.nameOriginal ?? 'Без названия'
  const rating = film.ratingKinopoisk ?? film.ratingImdb
  const ratingColor =
    rating && rating >= 7 ? 'good' :
    rating && rating >= 5 ? 'mid'  : 'bad'

  const handleClick = useCallback(() => onClick(film), [film, onClick])
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') onClick(film) },
    [film, onClick]
  )

  return (
    <motion.article
      className={styles.card}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: EASING }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${title}${film.year ? `, ${film.year}` : ''}`}
    >
      <div className={styles.posterWrap}>
        {!imgError ? (
          <Image
            src={film.posterUrlPreview || film.posterUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 40vw, 160px"
            className={styles.poster}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className={styles.posterFallback}>
            <span className={styles.posterFallbackText}>
              {title.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        {rating && (
          <div className={styles.ratingBadge} data-quality={ratingColor}>
            <Star size={9} strokeWidth={2} fill="currentColor" />
            <span>{rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className={styles.info}>
        <h3 className={styles.title}>{title}</h3>
        {film.year && (
          <div className={styles.meta}>
            <Calendar size={11} strokeWidth={1.5} />
            <span>{film.year}</span>
          </div>
        )}
        {film.genres[0] && (
          <span className={styles.genre}>{film.genres[0].genre}</span>
        )}
      </div>
    </motion.article>
  )
})