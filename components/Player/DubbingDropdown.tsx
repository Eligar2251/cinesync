// components/Player/DubbingDropdown.tsx
'use client'

import { useState, useCallback, useRef, useEffect, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, Mic } from 'lucide-react'
import { DEFAULT_DUBBINGS, getProvider } from '@/lib/providers.config'
import styles from './DubbingDropdown.module.css'

interface DubbingDropdownProps {
  currentProvider: string
  currentDubbing: string
  onChange: (dubbing: string) => void
  isHost: boolean
}

const EASING = [0.25, 0.46, 0.45, 0.94] as const

export const DubbingDropdown = memo(function DubbingDropdown({
  currentProvider,
  currentDubbing,
  onChange,
  isHost,
}: DubbingDropdownProps) {
  const [isOpen, setIsOpen]   = useState(false)
  const containerRef          = useRef<HTMLDivElement>(null)

  const provider = getProvider(currentProvider)
  const dubbings = provider.supportedDubbings ?? DEFAULT_DUBBINGS

  const handleSelect = useCallback(
    (d: string) => {
      if (!isHost) return
      onChange(d)
      setIsOpen(false)
    },
    [isHost, onChange]
  )

  const handleToggle = useCallback(() => {
    if (!isHost) return
    setIsOpen((v) => !v)
  }, [isHost])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen])

  return (
    <div ref={containerRef} className={styles.wrapper}>
      <button
        className={styles.trigger}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={!isHost}
        title={!isHost ? 'Только хост может менять озвучку' : undefined}
      >
        <Mic size={12} strokeWidth={1.5} className={styles.triggerIcon} />
        <span className={styles.triggerLabel}>
          Озвучка: <strong>{currentDubbing}</strong>
        </span>
        <ChevronDown
          size={12}
          strokeWidth={1.5}
          className={styles.chevron}
          data-open={isOpen}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            className={styles.dropdown}
            role="listbox"
            aria-label="Выбор озвучки"
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: EASING }}
          >
            {dubbings.map((d) => {
              const isSelected = d === currentDubbing
              return (
                <li
                  key={d}
                  role="option"
                  aria-selected={isSelected}
                  className={styles.option}
                  data-selected={isSelected}
                  onClick={() => handleSelect(d)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(d) }}
                  tabIndex={0}
                >
                  <span>{d}</span>
                  {isSelected && (
                    <Check size={12} strokeWidth={2} className={styles.checkIcon} />
                  )}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
})