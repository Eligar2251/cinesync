// components/Player/ControlsBar.tsx
'use client'

import { memo, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { ProviderSelector } from './ProviderSelector'
import { DubbingDropdown } from './DubbingDropdown'
import { useRoomStore } from '@/store/room.store'
import styles from './ControlsBar.module.css'

interface ControlsBarProps {
  currentProvider: string
  currentDubbing:  string
  isHost:          boolean
  onProviderChange: (id: string)      => void
  onDubbingChange:  (dubbing: string) => void
  onSyncRequest:    ()                => void
}

export const ControlsBar = memo(function ControlsBar({
  currentProvider,
  currentDubbing,
  isHost,
  onProviderChange,
  onDubbingChange,
  onSyncRequest,
}: ControlsBarProps) {
  const isSynced = useRoomStore((s) => s.isSynced)

  const handleSync = useCallback(() => {
    onSyncRequest()
  }, [onSyncRequest])

  return (
    <div className={styles.bar}>
      {/* Left: providers + dubbing */}
      <div className={styles.left}>
        <ProviderSelector
          current={currentProvider}
          onChange={onProviderChange}
          isHost={isHost}
        />
        <div className={styles.sep} />
        <DubbingDropdown
          currentProvider={currentProvider}
          currentDubbing={currentDubbing}
          onChange={onDubbingChange}
          isHost={isHost}
        />
      </div>

      {/* Right: sync button */}
      <div className={styles.right}>
        {!isSynced && (
          <button
            className={styles.syncBtn}
            onClick={handleSync}
            aria-label="Синхронизироваться с хостом"
          >
            <RefreshCw size={13} strokeWidth={1.5} />
            <span>Синхронизироваться</span>
          </button>
        )}
        {isSynced && (
          <button
            className={styles.syncBtnSynced}
            onClick={handleSync}
            aria-label="Запросить синхронизацию"
          >
            <RefreshCw size={13} strokeWidth={1.5} />
            <span>Синхронизировать всех</span>
          </button>
        )}
      </div>
    </div>
  )
})