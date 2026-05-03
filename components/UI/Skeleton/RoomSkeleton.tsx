// components/UI/Skeleton/RoomSkeleton.tsx
import { Skeleton } from './Skeleton'
import styles from './RoomSkeleton.module.css'

export function RoomLayoutSkeleton() {
  return (
    <div className={styles.layout}>
      {/* TopBar */}
      <div className={styles.topbar}>
        <Skeleton width={80} height={18} borderRadius="4px" />
        <div className={styles.topbarRight}>
          <Skeleton width={28} height={28} borderRadius="50%" />
          <Skeleton width={28} height={28} borderRadius="50%" />
          <Skeleton width={28} height={28} borderRadius="50%" />
        </div>
      </div>

      <div className={styles.body}>
        {/* Player */}
        <div className={styles.playerArea}>
          <Skeleton height="100%" borderRadius="0" />
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.participants}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.participantRow}>
                <Skeleton width={28} height={28} borderRadius="50%" />
                <div className={styles.participantInfo}>
                  <Skeleton width={80} height={12} borderRadius="3px" />
                  <Skeleton width={40} height={10} borderRadius="3px" />
                </div>
              </div>
            ))}
          </div>
          <div className={styles.chatArea}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.chatMsg} style={{ opacity: 1 - i * 0.08 }}>
                <Skeleton width={48} height={12} borderRadius="3px" />
                <Skeleton
                  width={`${50 + Math.random() * 40}%`}
                  height={12}
                  borderRadius="3px"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}