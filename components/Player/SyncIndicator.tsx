// components/Player/SyncIndicator.tsx
'use client'

import { memo } from 'react'
import { useRoomStore } from '@/store/room.store'
import styles from './SyncIndicator.module.css'

export const SyncIndicator = memo(function SyncIndicator() {
  const isSynced = useRoomStore((s) => s.isSynced)

  return (
    <div
      className={styles.indicator}
      aria-live="polite"
      aria-label={isSynced ? 'В синхронизации' : 'Нет синхронизации'}
    >
      <span
        className={styles.dot}
        data-synced={isSynced}
        aria-hidden="true"
      />
      <span className={styles.label}>
        {isSynced ? 'В синхронизации' : 'Не синхронно'}
      </span>
    </div>
  )
})