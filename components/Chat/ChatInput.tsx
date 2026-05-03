// components/Chat/ChatInput.tsx
'use client'

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react'
import { AnimatePresence } from 'framer-motion'
import { Smile, Send } from 'lucide-react'
import { EmojiPicker } from './EmojiPicker'
import { wsClient } from '@/lib/ws-client'
import styles from './ChatInput.module.css'

const MAX_LENGTH = 500

export function ChatInput() {
  const [value, setValue]         = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const textareaRef               = useRef<HTMLTextAreaElement>(null)
  const wrapperRef                = useRef<HTMLDivElement>(null)

  // Auto-resize textarea
  const resize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [])

  useEffect(() => { resize() }, [value, resize])

  const sendMessage = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || trimmed.length > MAX_LENGTH) return

    wsClient.send({
      type:    'CHAT_MESSAGE',
      payload: { content: trimmed },
    })

    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value])

  const sendReaction = useCallback((emoji: string) => {
    wsClient.send({
      type:    'REACTION',
      payload: { emoji },
    })
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage]
  )

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      if (e.target.value.length <= MAX_LENGTH) {
        setValue(e.target.value)
      }
    },
    []
  )

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      // If textarea is focused and value exists — insert into message
      // Otherwise send as floating reaction
      if (value.trim().length > 0) {
        setValue((v) => v + emoji)
        textareaRef.current?.focus()
      } else {
        sendReaction(emoji)
      }
    },
    [value, sendReaction]
  )

  const toggleEmoji = useCallback(() => {
    setShowEmoji((v) => !v)
  }, [])

  const closeEmoji = useCallback(() => {
    setShowEmoji(false)
  }, [])

  // Close emoji on outside click
  useEffect(() => {
    if (!showEmoji) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowEmoji(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmoji])

  const canSend = value.trim().length > 0

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      {/* Emoji picker — above input */}
      <AnimatePresence>
        {showEmoji && (
          <EmojiPicker onSelect={handleEmojiSelect} onClose={closeEmoji} />
        )}
      </AnimatePresence>

      <div className={styles.inputRow}>
        {/* Emoji button */}
        <button
          className={styles.emojiToggle}
          onClick={toggleEmoji}
          aria-label="Открыть эмодзи"
          aria-expanded={showEmoji}
          type="button"
        >
          <Smile
            size={17}
            strokeWidth={1.5}
            className={styles.emojiIcon}
            data-active={showEmoji}
          />
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Написать..."
          rows={1}
          maxLength={MAX_LENGTH}
          aria-label="Сообщение"
          spellCheck
          autoComplete="off"
        />

        {/* Send button — only visible when has content */}
        <button
          className={styles.sendBtn}
          onClick={sendMessage}
          disabled={!canSend}
          aria-label="Отправить"
          type="button"
          data-visible={canSend}
        >
          <Send size={15} strokeWidth={1.5} />
        </button>
      </div>

      {/* Character counter — only shows when near limit */}
      {value.length > MAX_LENGTH * 0.8 && (
        <div className={styles.charCount} data-warn={value.length > MAX_LENGTH * 0.95}>
          {MAX_LENGTH - value.length}
        </div>
      )}
    </div>
  )
}