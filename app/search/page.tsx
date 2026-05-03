// app/search/page.tsx
'use client'

import { useState, useCallback, useEffect, useTransition } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, LogIn } from 'lucide-react'
import { SearchBar } from '@/components/Search/SearchBar'
import { HomeGrid, SearchResultsGrid } from '@/components/Search/MovieGrid'
import { MovieActionModal } from '@/components/Search/MovieActionModal'
import { useUserStore } from '@/store/user.store'
import type { KPFilm, KPSearchResponse } from '@/lib/kp.types'
import styles from './search.module.css'

const EASING = [0.25, 0.46, 0.45, 0.94] as const

async function fetchFilms(query: string, type: string): Promise<KPFilm[]> {
  const params = query
    ? `?q=${encodeURIComponent(query)}`
    : `?type=${type}`
  const res = await fetch(`/api/search${params}`)
  if (!res.ok) return []
  const data = (await res.json()) as KPSearchResponse
  return data.films ?? []
}

export default function SearchPage() {
  const { user } = useUserStore()
  const [query, setQuery]               = useState('')
  const [topFilms, setTopFilms]         = useState<KPFilm[]>([])
  const [popularFilms, setPopularFilms] = useState<KPFilm[]>([])
  const [searchResults, setSearchResults] = useState<KPFilm[]>([])
  const [isLoading, setIsLoading]       = useState(true)
  const [selectedFilm, setSelectedFilm] = useState<KPFilm | null>(null)
  const [, startTransition]             = useTransition()

  // Load home data
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    Promise.all([
      fetchFilms('', 'top'),
      fetchFilms('', 'popular'),
    ]).then(([top, popular]) => {
      if (cancelled) return
      setTopFilms(top)
      setPopularFilms(popular)
      setIsLoading(false)
    }).catch(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const handleSearch = useCallback((q: string) => {
    setQuery(q)
    if (q.trim().length === 0) {
      setSearchResults([])
      return
    }
    setIsLoading(true)
    startTransition(() => {
      fetchFilms(q, 'search').then((films) => {
        setSearchResults(films)
        setIsLoading(false)
      }).catch(() => setIsLoading(false))
    })
  }, [])

  const handleFilmClick = useCallback((film: KPFilm) => {
    setSelectedFilm(film)
  }, [])

  const handleModalClose = useCallback(() => {
    setSelectedFilm(null)
  }, [])

  const isSearching = query.trim().length > 0

  return (
    <div className={styles.page}>
      {/* Top nav */}
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark}>◈</span>
          <span className={styles.logoName}>CineSync</span>
        </Link>
        <nav className={styles.nav}>
          {user ? (
            <>
              <Link href="/room/create" className={styles.navBtn}>
                <Plus size={15} strokeWidth={1.5} />
                Создать комнату
              </Link>
              <Link href="/profile" className={styles.avatarLink}>
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className={styles.avatar}
                  />
                ) : (
                  <div
                    className={styles.avatarInitial}
                    style={{ background: user.chatColor + '22', borderColor: user.chatColor + '44' }}
                  >
                    <span style={{ color: user.chatColor }}>
                      {user.username.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}
              </Link>
            </>
          ) : (
            <Link href="/login" className={styles.navBtn}>
              <LogIn size={15} strokeWidth={1.5} />
              Войти
            </Link>
          )}
        </nav>
      </header>

      {/* Hero search */}
      <motion.section
        className={styles.hero}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASING }}
      >
        <h1 className={styles.heroTitle}>Смотрите вместе</h1>
        <p className={styles.heroSub}>
          Найдите фильм и создайте приватный сеанс
        </p>
        <SearchBar onSearch={handleSearch} />
      </motion.section>

      {/* Content */}
      <main className={styles.main}>
        {isSearching ? (
          <SearchResultsGrid
            films={searchResults}
            isLoading={isLoading}
            query={query}
            onFilmClick={handleFilmClick}
          />
        ) : (
          <HomeGrid
            topFilms={topFilms}
            popularFilms={popularFilms}
            isLoading={isLoading}
            onFilmClick={handleFilmClick}
          />
        )}
      </main>

      {/* Film action modal */}
      <MovieActionModal film={selectedFilm} onClose={handleModalClose} />
    </div>
  )
}