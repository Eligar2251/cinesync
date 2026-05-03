// components/Chat/EmojiPicker.tsx
'use client'

import { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import styles from './EmojiPicker.module.css'

const QUICK_EMOJIS = [
  '👍', '😂', '😭', '😱', '🔥',
  '😤', '🤣', '💀', '❤️', '👏',
  '😍', '🤔', '😎', '🙈', '✨',
  '🫡', '💯', '😅', '🤯', '🫶',
]

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose:  () => void
}

const EASING = [0.25, 0.46, 0.45, 0.94] as const

export const EmojiPicker = memo(function EmojiPicker({
  onSelect,
  onClose,
}: EmojiPickerProps) {
  const handleSelect = useCallback(
    (emoji: string) => {
      onSelect(emoji)
      onClose()
    },
    [onSelect, onClose]
  )

  return (
    <motion.div
      className={styles.picker}
      initial={{ opacity: 0, y: 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.95 }}
      transition={{ duration: 0.15, ease: EASING }}
      role="dialog"
      aria-label="Быстрый выбор эмодзи"
    >
      <div className={styles.grid}>
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            className={styles.emojiBtn}
            onClick={() => handleSelect(emoji)}
            aria-label={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  )
})