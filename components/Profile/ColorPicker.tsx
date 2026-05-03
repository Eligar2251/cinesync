// components/Profile/ColorPicker.tsx
'use client'

import { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import styles from './ColorPicker.module.css'

const PRESET_COLORS = [
  { hex: '#E8C97A', label: 'Золотой'   },
  { hex: '#7EB8F7', label: 'Голубой'   },
  { hex: '#A8E6A3', label: 'Зелёный'   },
  { hex: '#F4A0A0', label: 'Розовый'   },
  { hex: '#C3A8F5', label: 'Фиолетовый'},
  { hex: '#F5C8A8', label: 'Оранжевый' },
  { hex: '#A8F0F5', label: 'Бирюзовый' },
  { hex: '#F5A8D4', label: 'Малиновый' },
]

const EASING = [0.25, 0.46, 0.45, 0.94] as const

interface ColorPickerProps {
  current:  string
  onChange: (color: string) => void
}

export const ColorPicker = memo(function ColorPicker({
  current,
  onChange,
}: ColorPickerProps) {
  const handleSelect = useCallback(
    (hex: string) => { onChange(hex) },
    [onChange]
  )

  return (
    <div className={styles.wrapper} role="radiogroup" aria-label="Цвет ника">
      {PRESET_COLORS.map(({ hex, label }) => {
        const isActive = hex.toLowerCase() === current.toLowerCase()
        return (
          <button
            key={hex}
            className={styles.swatch}
            style={{ background: hex }}
            onClick={() => handleSelect(hex)}
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
          >
            {isActive && (
              <motion.span
                className={styles.checkWrap}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: EASING }}
              >
                <Check size={12} strokeWidth={3} className={styles.checkIcon} />
              </motion.span>
            )}
            {isActive && (
              <motion.span
                className={styles.ring}
                layoutId="color-ring"
                style={{ borderColor: hex }}
                transition={{ duration: 0.2, ease: EASING }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
})