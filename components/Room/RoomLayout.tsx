// components/Room/RoomLayout.tsx
'use client'

import { useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { RoomTopBar } from './RoomTopBar'
import { ParticipantsList } from './ParticipantsList'
import { useRoomStore } from '@/store/room.store'
import { useUserStore } from '@/store/user.store'
import styles from './RoomLayout.module.css'

const Player  = dynamic(() => import('@/components/Player/Player').then(m => m.Player), {
  ssr: false,
  loading: () => <div className={styles.playerSkeleton} />,
})

const Chat = dynamic(() => import('@/components/Chat/Chat').then(m => m.Chat), {
  ssr: false,
  loading: () => <div className={styles.chatSkeleton} />,
})

interface RoomLayoutProps {
  slug: string
}

const EASING = [0.25, 0.46, 0.45, 0.94] as const

export function RoomLayout({ slug }: RoomLayoutProps) {
  const router     = useRouter()
  const { user }   = useUserStore()
  const { room, clearRoom } = useRoomStore()
  const initRef    = useRef(false)

  const handleLeave = useCallback(() => {
    clearRoom()
    router.push('/search')
  }, [clearRoom, router])

  // Prevent double-mount in dev StrictMode
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
  }, [slug])

  return (
    <motion.div
      className={styles.layout}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: EASING }}
    >
      <RoomTopBar onLeave={handleLeave} />

      <div className={styles.body}>
        {/* Main: Player + Controls */}
        <div className={styles.main}>
          <div className={styles.playerArea}>
            <Player slug={slug} />
          </div>
        </div>

        {/* Sidebar: Chat + Participants */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarParticipants}>
            <ParticipantsList myId={user?.id} />
          </div>
          <div className={styles.sidebarDivider} />
          <div className={styles.sidebarChat}>
            <Chat />
          </div>
        </aside>
      </div>
    </motion.div>
  )
}