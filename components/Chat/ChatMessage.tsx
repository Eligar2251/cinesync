// components/Chat/ChatMessage.tsx
'use client'

import { memo } from 'react'
import type { ChatMessage as ChatMessageType } from '@/store/room.store'
import styles from './ChatMessage.module.css'

interface ChatMessageProps {
  message: ChatMessageType
  isOwn:   boolean
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', {
    hour:   '2-digit',
    minute: '2-digit',
  })
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isOwn,
}: ChatMessageProps) {
  if (message.type === 'system') {
    return (
      <div className={styles.system} role="status" aria-live="polite">
        <span className={styles.systemText}>{message.content}</span>
      </div>
    )
  }

  if (message.type === 'reaction') {
    return (
      <div className={styles.reactionRow}>
        <span
          className={styles.reactionUsername}
          style={{ color: message.chatColor }}
        >
          {message.username}
        </span>
        <span className={styles.reactionEmoji}>{message.content}</span>
      </div>
    )
  }

  return (
    <div
      className={styles.message}
      data-own={isOwn}
    >
      <span
        className={styles.username}
        style={{ color: message.chatColor }}
      >
        {message.username}
      </span>
      <span className={styles.content}>{message.content}</span>
      <span className={styles.time}>{formatTime(message.createdAt)}</span>
    </div>
  )
},
// Custom comparison — only re-render if message itself changed
(prev, next) => prev.message.id === next.message.id && prev.isOwn === next.isOwn
)