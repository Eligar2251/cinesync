// components/Search/SearchBar.tsx
'use client'

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Clock } from 'lucide-react'
import styles from './SearchBar.module.css'

interface SearchBarProps {
  onSearch: (query: string) => void
  initialValue?: string
}

const HISTORY_KEY  = 'cinesync_search_history'
const HISTORY_MAX  = 5
const DEBOUNCE_MS  = 300

function getHistory(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function saveToHistory(query: string): void {
  const prev = getHistory().filter((h) => h !== query)
  const next = [query, ...prev].slice(0, HISTORY_MAX)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}

function removeFromHistory(query: string): void {
  const next = getHistory().filter((h) => h !== query)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}

const EASING = [0.25, 0.46, 0.45, 0.94] as const

export function SearchBar({ onSearch, initialValue = '' }: SearchBarProps) {
  const [value, setValue]           = useState(initialValue)
  const [isFocused, setIsFocused]   = useState(false)
  const [history, setHistory]       = useState<string[]>([])
  const inputRef  = useRef<HTMLInputElement>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showDropdown = isFocused && value.trim().length === 0 && history.length > 0

  useEffect(() => {
    setHistory(getHistory())
  }, [isFocused])

  const triggerSearch = useCallback(
    (query: string) => {
      if (query.trim().length > 0) saveToHistory(query.trim())
      onSearch(query.trim())
    },
    [onSearch]
  )

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value
      setValue(q)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => triggerSearch(q), DEBOUNCE_MS)
    },
    [triggerSearch]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        if (timerRef.current) clearTimeout(timerRef.current)
        triggerSearch(value)
        inputRef.current?.blur()
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur()
      }
    },
    [triggerSearch, value]
  )

  const handleClear = useCallback(() => {
    setValue('')
    onSearch('')
    inputRef.current?.focus()
  }, [onSearch])

  const handleHistoryClick = useCallback(
    (q: string) => {
      setValue(q)
      triggerSearch(q)
      setIsFocused(false)
    },
    [triggerSearch]
  )

  const handleRemoveHistory = useCallback((q: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeFromHistory(q)
    setHistory(getHistory())
  }, [])

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputWrap} data-focused={isFocused}>
        <Search
          size={18}
          strokeWidth={1.5}
          className={styles.searchIcon}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          placeholder="Найти фильм, сериал..."
          className={styles.input}
          autoComplete="off"
          spellCheck={false}
          aria-label="Поиск фильмов"
        />
        <AnimatePresence>
          {value.length > 0 && (
            <motion.button
              className={styles.clearBtn}
              onClick={handleClear}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.12 }}
              aria-label="Очистить"
            >
              <X size={14} strokeWidth={2} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            className={styles.dropdown}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: EASING }}
          >
            <p className={styles.dropdownLabel}>Недавние</p>
            {history.map((q) => (
              <div
                key={q}
                className={styles.historyItem}
                onClick={() => handleHistoryClick(q)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') handleHistoryClick(q) }}
              >
                <Clock size={13} strokeWidth={1.5} className={styles.historyIcon} />
                <span className={styles.historyText}>{q}</span>
                <button
                  className={styles.historyRemove}
                  onClick={(e) => handleRemoveHistory(q, e)}
                  aria-label={`Удалить ${q} из истории`}
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}