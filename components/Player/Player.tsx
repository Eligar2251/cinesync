// components/Player/Player.tsx
'use client'

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  memo,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProviderSelector }  from './ProviderSelector'
import { ControlsBar }       from './ControlsBar'
import { SyncIndicator }     from './SyncIndicator'
import { useRoomStore }      from '@/store/room.store'
import { getProvider }       from '@/lib/providers.config'
import { wsClient }          from '@/lib/ws-client'
import styles                from './Player.module.css'

interface PlayerProps {
  slug: string
}

const EASING              = [0.25, 0.46, 0.45, 0.94] as const
const CONTROLS_HIDE_DELAY = 3000

export const Player = memo(function Player({ slug: _slug }: PlayerProps) {
  const iframeRef         = useRef<HTMLIFrameElement>(null)
  const wrapperRef        = useRef<HTMLDivElement>(null)
  const hideTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const iframeKeyRef      = useRef(0)

  const [controlsVisible, setControlsVisible] = useState(true)
  const [iframeOpacity, setIframeOpacity]     = useState(1)
  const [isSyncFlashing, setIsSyncFlashing]   = useState(false)
  const [iframeKey, setIframeKey]             = useState(0)

  const room           = useRoomStore((s) => s.room)
  const playerState    = useRoomStore((s) => s.playerState)
  const isHost         = useRoomStore((s) => s.isHost)
  const setPlayerState = useRoomStore((s) => s.setPlayerState)

  const currentProvider = getProvider(playerState.provider)
  const iframeSrc       = room?.kpId
    ? currentProvider.buildUrl(room.kpId)
    : null

  // ─── Controls visibility ──────────────────────────────────────────────────
  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false)
    }, CONTROLS_HIDE_DELAY)
  }, [])

  const handleMouseMove = useCallback(() => {
    showControls()
  }, [showControls])

  const handleMouseLeave = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    setControlsVisible(false)
  }, [])

  useEffect(() => {
    showControls()
    return () => {
      if (hideTimerRef.current)      clearTimeout(hideTimerRef.current)
      if (syncFlashTimerRef.current) clearTimeout(syncFlashTimerRef.current)
    }
  }, [showControls])

  // ─── Sync flash ───────────────────────────────────────────────────────────
  const triggerSyncFlash = useCallback(() => {
    setIsSyncFlashing(true)
    if (syncFlashTimerRef.current) clearTimeout(syncFlashTimerRef.current)
    syncFlashTimerRef.current = setTimeout(() => {
      setIsSyncFlashing(false)
    }, 600)
  }, [])

  // Подписка без селектора — сравниваем вручную
  // Это работает всегда, независимо от middleware
  useEffect(() => {
    let prevSynced = useRoomStore.getState().isSynced

    const unsubscribe = useRoomStore.subscribe((state) => {
      const nextSynced = state.isSynced
      if (nextSynced !== prevSynced) {
        prevSynced = nextSynced
        if (nextSynced) {
          triggerSyncFlash()
        }
      }
    })

    return unsubscribe
  }, [triggerSyncFlash])

  // ─── Provider switch ──────────────────────────────────────────────────────
  const handleProviderChange = useCallback(
    (providerId: string) => {
      if (!isHost) return

      setIframeOpacity(0)

      setTimeout(() => {
        setPlayerState({ provider: providerId })
        iframeKeyRef.current += 1
        setIframeKey(iframeKeyRef.current)

        wsClient.send({
          type:    'CHANGE_PROVIDER',
          payload: {
            provider:    providerId,
            currentTime: playerState.currentTime,
          },
        })

        setTimeout(() => {
          wsClient.send({
            type:    'SEEK',
            payload: { currentTime: playerState.currentTime },
          })
          setIframeOpacity(1)
        }, 3000)
      }, 250)
    },
    [isHost, playerState.currentTime, setPlayerState]
  )

  // ─── Dubbing change ───────────────────────────────────────────────────────
  const handleDubbingChange = useCallback(
    (dubbing: string) => {
      if (!isHost) return
      setPlayerState({ dubbing })
      wsClient.send({ type: 'CHANGE_DUBBING', payload: { dubbing } })
    },
    [isHost, setPlayerState]
  )

  // ─── Sync request ─────────────────────────────────────────────────────────
  const handleSyncRequest = useCallback(() => {
    wsClient.send({ type: 'SYNC_REQUEST', payload: {} })
  }, [])

  // ─── postMessage to iframe ────────────────────────────────────────────────
  const postToIframe = useCallback((data: Record<string, unknown>) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(data, '*')
    } catch {
      // cross-origin — silently ignore
    }
  }, [])

  useEffect(() => {
    postToIframe({ api: playerState.isPlaying ? 'play' : 'pause' })
  }, [playerState.isPlaying, postToIframe])

  useEffect(() => {
    if (playerState.currentTime > 0) {
      postToIframe({ api: 'seek', set: playerState.currentTime })
    }
  }, [playerState.currentTime, postToIframe])

  return (
    <div
      ref={wrapperRef}
      className={styles.wrapper}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-sync-flash={isSyncFlashing}
    >
      <div className={styles.iframeContainer}>
        {iframeSrc ? (
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={iframeSrc}
            className={styles.iframe}
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media"
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
            style={{
              opacity:    iframeOpacity,
              transition: 'opacity 250ms ease',
            }}
            title={room?.movieTitle ?? 'Видеоплеер'}
          />
        ) : (
          <div className={styles.noSource}>
            <span className={styles.noSourceIcon}>◈</span>
            <p className={styles.noSourceText}>Источник не выбран</p>
            <p className={styles.noSourceSub}>
              Выберите фильм на главной странице
            </p>
          </div>
        )}

        <div className={styles.vignette} aria-hidden="true" />
        <SyncIndicator />
      </div>

      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            className={styles.controlsOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASING }}
          >
            <ControlsBar
              onSyncRequest={handleSyncRequest}
              onProviderChange={handleProviderChange}
              onDubbingChange={handleDubbingChange}
              currentProvider={playerState.provider}
              currentDubbing={playerState.dubbing}
              isHost={isHost}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})