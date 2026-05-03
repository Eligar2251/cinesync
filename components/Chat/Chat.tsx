// components/Chat/Chat.tsx
'use client'

import {
  useRef,
  useCallback,
  useEffect,
  useState,
  useMemo,
  useLayoutEffect,
  memo,
  type UIEvent,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { useRoomStore, type ChatMessage as ChatMessageType } from '@/store/room.store'
import { useUserStore } from '@/store/user.store'
import styles from './Chat.module.css'

const EASING = [0.25, 0.46, 0.45, 0.94] as const
const VIRTUALIZE_THRESHOLD = 200
const SYSTEM_ROW_HEIGHT = 28
const REACTION_ROW_HEIGHT = 28
const DEFAULT_ROW_HEIGHT = 36
const OVERSCAN_PX = 320
const CHARS_PER_LINE = 36

function estimateRowHeight(msg: ChatMessageType): number {
  if (msg.type === 'system') return SYSTEM_ROW_HEIGHT
  if (msg.type === 'reaction') return REACTION_ROW_HEIGHT

  const lines = Math.ceil(msg.content.length / CHARS_PER_LINE) + 1
  return Math.max(DEFAULT_ROW_HEIGHT, lines * 20 + 8)
}

interface FloatingReaction {
  id: string
  emoji: string
  username: string
  chatColor: string
  x: number
}

function ReactionOverlay({ reactions }: { reactions: FloatingReaction[] }) {
  return (
    <div className={styles.reactionOverlay} aria-hidden="true">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            className={styles.floatingReaction}
            style={{ left: `${r.x}%` }}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -60, scale: 1 }}
            exit={{ opacity: 0, y: -90, scale: 0.8 }}
            transition={{ duration: 0.6, ease: EASING }}
          >
            <span className={styles.floatingEmoji}>{r.emoji}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

interface MeasuredRowProps {
  message: ChatMessageType
  isOwn: boolean
  onHeightChange: (id: string, height: number) => void
}

const MeasuredRow = memo(function MeasuredRow({
  message,
  isOwn,
  onHeightChange,
}: MeasuredRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = rowRef.current
    if (!el) return

    const reportHeight = () => {
      const nextHeight = Math.ceil(el.getBoundingClientRect().height)
      if (nextHeight > 0) {
        onHeightChange(message.id, nextHeight)
      }
    }

    reportHeight()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(() => {
      reportHeight()
    })

    observer.observe(el)

    return () => {
      observer.disconnect()
    }
  }, [message.id, message.content, message.type, isOwn, onHeightChange])

  return (
    <div ref={rowRef}>
      <ChatMessage message={message} isOwn={isOwn} />
    </div>
  )
})

export const Chat = memo(function Chat() {
  const messages = useRoomStore((s) => s.messages)
  const { user } = useUserStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const prevLengthRef = useRef(0)
  const heightMapRef = useRef<Record<string, number>>({})

  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [heightVersion, setHeightVersion] = useState(0)
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])

  const virtualizationEnabled = messages.length > VIRTUALIZE_THRESHOLD

  const handleHeightChange = useCallback((id: string, height: number) => {
    const prev = heightMapRef.current[id]
    if (prev !== height) {
      heightMapRef.current[id] = height
      setHeightVersion((v) => v + 1)
    }
  }, [])

  // resize observer for chat viewport
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const updateSize = () => {
      setViewportHeight(el.clientHeight)
    }

    updateSize()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      updateSize()
    })

    observer.observe(el)

    return () => {
      observer.disconnect()
    }
  }, [])

  const layout = useMemo(() => {
    const tops: number[] = new Array(messages.length)
    const heights: number[] = new Array(messages.length)

    let totalHeight = 0

    for (let i = 0; i < messages.length; i += 1) {
      const msg = messages[i]
      if (!msg) continue

      tops[i] = totalHeight
      const measuredHeight = heightMapRef.current[msg.id]
      const rowHeight = measuredHeight ?? estimateRowHeight(msg)
      heights[i] = rowHeight
      totalHeight += rowHeight
    }

    return { tops, heights, totalHeight }
  }, [messages, heightVersion])

  const windowed = useMemo(() => {
    if (!virtualizationEnabled) {
      return {
        startIndex: 0,
        endIndex: messages.length,
        topSpacer: 0,
        bottomSpacer: 0,
      }
    }

    const minY = Math.max(0, scrollTop - OVERSCAN_PX)
    const maxY = scrollTop + viewportHeight + OVERSCAN_PX

    let startIndex = 0
    while (
      startIndex < messages.length &&
      (layout.tops[startIndex] ?? 0) + (layout.heights[startIndex] ?? 0) < minY
    ) {
      startIndex += 1
    }

    let endIndex = startIndex
    while (
      endIndex < messages.length &&
      (layout.tops[endIndex] ?? 0) < maxY
    ) {
      endIndex += 1
    }

    const topSpacer = layout.tops[startIndex] ?? 0

    const lastRenderedIndex = endIndex - 1
    const renderedBottom =
      lastRenderedIndex >= 0
        ? (layout.tops[lastRenderedIndex] ?? 0) + (layout.heights[lastRenderedIndex] ?? 0)
        : 0

    const bottomSpacer = Math.max(0, layout.totalHeight - renderedBottom)

    return {
      startIndex,
      endIndex,
      topSpacer,
      bottomSpacer,
    }
  }, [messages.length, layout, scrollTop, viewportHeight, virtualizationEnabled])

  const visibleMessages = useMemo(() => {
    if (!virtualizationEnabled) return messages
    return messages.slice(windowed.startIndex, windowed.endIndex)
  }, [messages, virtualizationEnabled, windowed.startIndex, windowed.endIndex])

  // auto scroll when user is already at bottom
  useEffect(() => {
    const hasNewMessages = messages.length > prevLengthRef.current
    prevLengthRef.current = messages.length

    if (!hasNewMessages || !isAtBottomRef.current) return

    requestAnimationFrame(() => {
      const el = containerRef.current
      if (!el) return
      el.scrollTop = el.scrollHeight
    })
  }, [messages.length, layout.totalHeight])

  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    setScrollTop(el.scrollTop)

    const distFromBottom = el.scrollHeight - el.clientHeight - el.scrollTop
    isAtBottomRef.current = distFromBottom < 80
  }, [])

  // floating reactions
  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.type !== 'reaction') return

    const reaction: FloatingReaction = {
      id: lastMsg.id,
      emoji: lastMsg.content,
      username: lastMsg.username,
      chatColor: lastMsg.chatColor,
      x: 20 + Math.random() * 60,
    }

    setFloatingReactions((prev) => [...prev, reaction])

    const timer = setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id))
    }, 2000)

    return () => clearTimeout(timer)
  }, [messages])

  return (
    <div className={styles.chat}>
      <div className={styles.messagesWrapper}>
        <ReactionOverlay reactions={floatingReactions} />

        <div
          ref={containerRef}
          className={styles.messageList}
          onScroll={handleScroll}
        >
          {virtualizationEnabled ? (
            <>
              <div style={{ height: windowed.topSpacer }} aria-hidden="true" />
              {visibleMessages.map((msg) => (
                <MeasuredRow
                  key={msg.id}
                  message={msg}
                  isOwn={msg.userId === user?.id}
                  onHeightChange={handleHeightChange}
                />
              ))}
              <div style={{ height: windowed.bottomSpacer }} aria-hidden="true" />
            </>
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isOwn={msg.userId === user?.id}
              />
            ))
          )}
        </div>
      </div>

      <ChatInput />
    </div>
  )
})