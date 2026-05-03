// components/Room/ParticipantsList.tsx
'use client'

import { memo } from 'react'
import { Crown, Clock } from 'lucide-react'
import { useRoomStore, type Participant } from '@/store/room.store'
import styles from './ParticipantsList.module.css'

function formatTime(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

const ParticipantRow = memo(function ParticipantRow({
  p,
  hostId,
  myId,
}: {
  p: Participant
  hostId: string
  myId: string | undefined
}) {
  const isMe   = p.id === myId
  const isHost = p.id === hostId

  return (
    <li className={styles.participant} data-me={isMe}>
      {/* Avatar */}
      <div
        className={styles.avatar}
        style={{ borderColor: p.chatColor + '55', background: p.chatColor + '18' }}
      >
        {p.avatarUrl ? (
          <img src={p.avatarUrl} alt={p.username} className={styles.avatarImg} />
        ) : (
          <span style={{ color: p.chatColor }} className={styles.avatarInitial}>
            {p.username.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.username} style={{ color: p.chatColor }}>
            {p.username}
          </span>
          {isHost && (
            <span className={styles.hostBadge} title="Хост">
              <Crown size={10} strokeWidth={2} fill="currentColor" />
              хост
            </span>
          )}
          {isMe && <span className={styles.youBadge}>вы</span>}
        </div>

        {/* Time tracker */}
        <div className={styles.timeRow}>
          <Clock size={10} strokeWidth={1.5} className={styles.clockIcon} />
          <span className={styles.timeValue}>{formatTime(p.currentTime)}</span>
        </div>
      </div>

      {/* Status dot */}
      <div
        className={styles.statusDot}
        data-online={Date.now() - p.lastSeen < 10000}
        title={Date.now() - p.lastSeen < 10000 ? 'Онлайн' : 'Неактивен'}
      />
    </li>
  )
})

interface ParticipantsListProps {
  myId: string | undefined
}

export const ParticipantsList = memo(function ParticipantsList({
  myId,
}: ParticipantsListProps) {
  const { participants, room } = useRoomStore()

  if (!room) return null

  return (
    <div className={styles.panel}>
      <p className={styles.heading}>
        Участники
        <span className={styles.count}>{participants.length}</span>
      </p>
      <ul className={styles.list}>
        {participants.map((p) => (
          <ParticipantRow
            key={p.id}
            p={p}
            hostId={room.hostId}
            myId={myId}
          />
        ))}
      </ul>
    </div>
  )
})