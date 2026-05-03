// components/Player/ProviderSelector.tsx
'use client'

import { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PROVIDERS } from '@/lib/providers.config'
import styles from './ProviderSelector.module.css'

interface ProviderSelectorProps {
  current: string
  onChange: (id: string) => void
  isHost: boolean
}

const EASING = [0.25, 0.46, 0.45, 0.94] as const

export const ProviderSelector = memo(function ProviderSelector({
  current,
  onChange,
  isHost,
}: ProviderSelectorProps) {
  const handleClick = useCallback(
    (id: string) => {
      if (!isHost || id === current) return
      onChange(id)
    },
    [isHost, current, onChange]
  )

  return (
    <div
      className={styles.wrapper}
      role="tablist"
      aria-label="Выбор провайдера"
    >
      {PROVIDERS.map((p) => {
        const isActive = p.id === current
        return (
          <button
            key={p.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={!isHost}
            className={styles.tab}
            data-active={isActive}
            data-disabled={!isHost}
            onClick={() => handleClick(p.id)}
            title={!isHost ? 'Только хост может менять провайдер' : `Переключить на ${p.label}`}
          >
            <span className={styles.label}>{p.label}</span>
            {isActive && (
              <motion.span
                className={styles.indicator}
                layoutId="provider-indicator"
                transition={{ duration: 0.25, ease: EASING }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
})