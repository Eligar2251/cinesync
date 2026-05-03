'use client'

import { memo, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, LogOut, Search } from 'lucide-react'
import { useRoomStore } from '@/store/room.store'
import { useUserStore } from '@/store/user.store'
import { RoomMovieSearch } from './RoomMovieSearch'
import styles from './RoomTopBar.module.css'

interface RoomTopBarProps {
  onLeave: () => void
}

export const RoomTopBar = memo(function RoomTopBar({ onLeave }: RoomTopBarProps) {
  const { room, participants, isConnected, isHost } = useRoomStore()
  const { user } = useUserStore()

  const [showSearch, setShowSearch] = useState(false)

  const displayParticipants = participants.slice(0, 6)
  const overflow = participants.length - 6

  const handleToggleSearch = useCallback(() => {
    setShowSearch((v) => !v)
  }, [])

  const handleCloseSearch = useCallback(() => {
    setShowSearch(false)
  }, [])

  return (
    <header className={styles.topbar}>
      {/* Left: Logo + room title */}
      <div className={styles.left}>
        <Link href="/search" className={styles.logo} aria-label="На главную">
          <span className={styles.logoMark}>◈</span>
        </Link>
        <div className={styles.sep} />
        {room && (
          <div className={styles.roomInfo}>
            <h1 className={styles.roomTitle}>{room.title}</h1>
            {room.movieTitle && room.movieTitle !== room.title && (
              <span className={styles.movieTitle}>{room.movieTitle}</span>
            )}
          </div>
        )}
        <div
          className={styles.connectionDot}
          data-connected={isConnected}
          title={isConnected ? 'Подключено' : 'Нет соединения'}
        />
      </div>

      {/* Center: Movie search */}
      <div className={styles.searchWrap}>
        <button
          className={styles.searchBtn}
          onClick={handleToggleSearch}
          aria-label="Поиск фильма"
          title="Сменить фильм"
        >
          <Search size={15} strokeWidth={1.5} />
          {room?.movieTitle ? (
            <span className={styles.searchBtnLabel}>{room.movieTitle}</span>
          ) : (
            <span className={styles.searchBtnLabel}>Выбрать фильм</span>
          )}
        </button>

        <AnimatePresence>
          {showSearch && (
            <RoomMovieSearch
              isHost={isHost}
              onClose={handleCloseSearch}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Right: Participants + leave */}
      <div className={styles.right}>
        <div className={styles.participants} aria-label="Участники">
          <AnimatePresence initial={false}>
            {displayParticipants.map((p) => (
              <motion.div
                key={p.id}
                className={styles.participantAvatar}
                title={`${p.username}${p.isHost ? ' (хост)' : ''}`}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                style={{ borderColor: p.chatColor + '66' }}
              >
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt={p.username} className={styles.avatarImg} />
                ) : (
                  <span
                    className={styles.avatarInitial}
                    style={{ background: p.chatColor + '22', color: p.chatColor }}
                  >
                    {p.username.slice(0, 1).toUpperCase()}
                  </span>
                )}
                {p.isHost && (
                  <span className={styles.hostBadge} aria-hidden="true">
                    <Crown size={8} strokeWidth={2} fill="currentColor" />
                  </span>
                )}
                {p.id === user?.id && (
                  <span className={styles.youDot} aria-label="Это вы" />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {overflow > 0 && (
            <div className={styles.overflowBadge} title={`Ещё ${overflow} участников`}>
              +{overflow}
            </div>
          )}
        </div>

        <button
          className={styles.leaveBtn}
          onClick={onLeave}
          aria-label="Покинуть комнату"
        >
          <LogOut size={15} strokeWidth={1.5} />
          <span className={styles.leaveBtnText}>Выйти</span>
        </button>
      </div>
    </header>
  )
})