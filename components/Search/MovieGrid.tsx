// components/Search/MovieGrid.tsx
'use client'

import { useRef, useCallback, memo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MovieCard } from './MovieCard'
import { MovieCardSkeleton } from '@/components/UI/Skeleton/Skeleton'
import type { KPFilm } from '@/lib/kp.types'
import styles from './MovieGrid.module.css'

interface MovieRowProps {
  title: string
  films: KPFilm[]
  isLoading: boolean
  onFilmClick: (film: KPFilm) => void
}

const MovieRow = memo(function MovieRow({
  title,
  films,
  isLoading,
  onFilmClick,
}: MovieRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = useCallback((dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = dir === 'right' ? 400 : -400
    el.scrollBy({ left: amount, behavior: 'smooth' })
  }, [])

  return (
    <section className={styles.row}>
      <div className={styles.rowHeader}>
        <h2 className={styles.rowTitle}>{title}</h2>
        <div className={styles.rowControls}>
          <button
            className={styles.scrollBtn}
            onClick={() => scroll('left')}
            aria-label="Прокрутить влево"
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <button
            className={styles.scrollBtn}
            onClick={() => scroll('right')}
            aria-label="Прокрутить вправо"
          >
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className={styles.rowScroll}>
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <MovieCardSkeleton key={`skeleton-${title}-${i}`} />
            ))
          : films.map((film, i) => (
              <MovieCard
                key={`${title}-${film.kinopoiskId}-${i}`}
                film={film}
                index={i}
                onClick={onFilmClick}
              />
            ))}
      </div>
    </section>
  )
})

interface SearchResultsGridProps {
  films: KPFilm[]
  isLoading: boolean
  query: string
  onFilmClick: (film: KPFilm) => void
}

export function SearchResultsGrid({
  films,
  isLoading,
  query,
  onFilmClick,
}: SearchResultsGridProps) {
  if (query.trim().length === 0) return null

  return (
    <section className={styles.searchResults}>
      <h2 className={styles.searchTitle}>
        {isLoading
          ? 'Поиск...'
          : films.length > 0
            ? `Результаты по «${query}» — ${films.length}`
            : `По запросу «${query}» ничего не найдено`}
      </h2>

      <div className={styles.searchGrid}>
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => (
              <MovieCardSkeleton key={`search-skeleton-${i}`} />
            ))
          : films.map((film, i) => (
              <MovieCard
                key={`search-${film.kinopoiskId}-${i}`}
                film={film}
                index={i}
                onClick={onFilmClick}
              />
            ))}
      </div>
    </section>
  )
}

interface HomeGridProps {
  topFilms: KPFilm[]
  popularFilms: KPFilm[]
  isLoading: boolean
  onFilmClick: (film: KPFilm) => void
}

export function HomeGrid({
  topFilms,
  popularFilms,
  isLoading,
  onFilmClick,
}: HomeGridProps) {
  const byGenre = useCallback(
    (films: KPFilm[], genre: string) =>
      films.filter((f) => f.genres.some((g) => g.genre === genre)),
    []
  )

  const dramas = byGenre(topFilms, 'драма').slice(0, 20)
  const thrill = byGenre(topFilms, 'триллер').slice(0, 20)
  const comedy = byGenre(popularFilms, 'комедия').slice(0, 20)

  return (
    <div className={styles.homeGrid}>
      <MovieRow
        title="Топ 250"
        films={topFilms.slice(0, 20)}
        isLoading={isLoading}
        onFilmClick={onFilmClick}
      />
      {dramas.length > 0 && (
        <MovieRow
          title="Драмы"
          films={dramas}
          isLoading={isLoading}
          onFilmClick={onFilmClick}
        />
      )}
      {thrill.length > 0 && (
        <MovieRow
          title="Триллеры"
          films={thrill}
          isLoading={isLoading}
          onFilmClick={onFilmClick}
        />
      )}
      <MovieRow
        title="Популярное"
        films={popularFilms.slice(0, 20)}
        isLoading={isLoading}
        onFilmClick={onFilmClick}
      />
      {comedy.length > 0 && (
        <MovieRow
          title="Комедии"
          films={comedy}
          isLoading={isLoading}
          onFilmClick={onFilmClick}
        />
      )}
    </div>
  )
}