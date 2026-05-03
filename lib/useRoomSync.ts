'use client'

import { useEffect, useRef, useCallback } from 'react'
import { wsClient }         from './ws-client'
import { useRoomStore }     from '@/store/room.store'
import { useUserStore }     from '@/store/user.store'
import type { Participant, ChatMessage, PlayerState } from '@/store/room.store'

// RAF-based message batch processor
function createMessageQueue(
  flush: (msgs: ChatMessage[]) => void
) {
  let queue: ChatMessage[] = []
  let rafId: number | null = null

  const scheduleFlush = () => {
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      if (queue.length > 0) {
        flush([...queue])
        queue = []
      }
      rafId = null
    })
  }

  return {
    push: (msg: ChatMessage) => {
      queue.push(msg)
      scheduleFlush()
    },
    destroy: () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
    },
  }
}

interface UseRoomSyncOptions {
  slug:     string
  hostId:   string
  token:    string
}

export function useRoomSync({ slug, hostId, token }: UseRoomSyncOptions) {
  const {
    setConnected,
    setParticipants,
    addParticipant,
    removeParticipant,
    updateParticipantTime,
    setPlayerState,
    addMessage,
    addMessages,
    setIsHost,
    setIsSynced,
    setLocalTime,
    participants,
  } = useRoomStore()

  const { user } = useUserStore()

  const timeUpdateTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const localTimeRef    = useRef(0)
  const msgQueue        = useRef(createMessageQueue(addMessages))

  // ─── Connect & join room ───────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !slug) return

    wsClient.connect(token, slug)

    const unsubConnected = wsClient.on('CONNECTED', () => {
      setConnected(true)
      wsClient.send({
        type:    'JOIN_ROOM',
        payload: { slug, hostId },
      })
    })

    return () => {
      unsubConnected()
      wsClient.disconnect()
      setConnected(false)
      if (timeUpdateTimer.current) clearInterval(timeUpdateTimer.current)
      msgQueue.current.destroy()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, token, hostId])

  // ─── ROOM_STATE (initial state on join) ────────────────────────────────────
  useEffect(() => {
    const unsub = wsClient.on('ROOM_STATE', (payload) => {
      const ps           = payload['playerState'] as PlayerState
      const parts        = payload['participants'] as Participant[]
      const isHostResult = payload['isHost'] as boolean

      setPlayerState(ps)
      setParticipants(parts)
      setIsHost(isHostResult)
      setIsSynced(true)

      localTimeRef.current = ps.currentTime
      setLocalTime(ps.currentTime)
    })
    return unsub
  }, [setPlayerState, setParticipants, setIsHost, setIsSynced, setLocalTime])

  // ─── Participants ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubJoin = wsClient.on('PARTICIPANT_JOINED', (payload) => {
      addParticipant(payload as unknown as Participant)
    })
    const unsubLeft = wsClient.on('PARTICIPANT_LEFT', (payload) => {
      removeParticipant(payload['userId'] as string)
    })
    const unsubTime = wsClient.on('PARTICIPANT_TIME_UPDATE', (payload) => {
      updateParticipantTime(
        payload['userId'] as string,
        payload['currentTime'] as number
      )
    })

    return () => { unsubJoin(); unsubLeft(); unsubTime() }
  }, [addParticipant, removeParticipant, updateParticipantTime])

  // ─── Player events ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubPlay = wsClient.on('PLAY', (payload) => {
      const t = payload['currentTime'] as number
      setPlayerState({ isPlaying: true, currentTime: t })
      localTimeRef.current = t
      setLocalTime(t)
      setIsSynced(true)
    })

    const unsubPause = wsClient.on('PAUSE', (payload) => {
      const t = payload['currentTime'] as number
      setPlayerState({ isPlaying: false, currentTime: t })
      localTimeRef.current = t
      setLocalTime(t)
      setIsSynced(true)
    })

    const unsubSeek = wsClient.on('SEEK', (payload) => {
      const t = payload['currentTime'] as number
      setPlayerState({ currentTime: t })
      localTimeRef.current = t
      setLocalTime(t)
      setIsSynced(true)
    })

    const unsubProvider = wsClient.on('CHANGE_PROVIDER', (payload) => {
      setPlayerState({
        provider:    payload['provider'] as string,
        currentTime: payload['currentTime'] as number,
      })
    })

    const unsubDubbing = wsClient.on('CHANGE_DUBBING', (payload) => {
      setPlayerState({ dubbing: payload['dubbing'] as string })
    })

    return () => {
      unsubPlay(); unsubPause(); unsubSeek()
      unsubProvider(); unsubDubbing()
    }
  }, [setPlayerState, setLocalTime, setIsSynced])

  // ─── CHANGE_MOVIE ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = wsClient.on('CHANGE_MOVIE', (payload) => {
      const { room } = useRoomStore.getState()
      if (!room) return

      useRoomStore.getState().setRoom({
        ...room,
        kpId:       payload['kpId']       as string,
        movieTitle: payload['movieTitle'] as string,
        posterUrl:  payload['posterUrl']  as string,
      })

      useRoomStore.getState().setPlayerState({
        currentTime: 0,
        isPlaying:   false,
        provider:    payload['provider'] as string,
      })
    })

    return unsub
  }, [])

  // ─── Sync events ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubSyncNeeded = wsClient.on('SYNC_NEEDED', () => {
      setIsSynced(false)
    })

    const unsubSyncResponse = wsClient.on('SYNC_RESPONSE', (payload) => {
      const t = payload['currentTime'] as number
      setPlayerState({
        currentTime: t,
        isPlaying:   payload['isPlaying'] as boolean,
        provider:    payload['provider'] as string,
        dubbing:     payload['dubbing'] as string,
      })
      localTimeRef.current = t
      setLocalTime(t)
      setIsSynced(true)
    })

    const unsubForceSync = wsClient.on('FORCE_SYNC', (payload) => {
      const t = payload['currentTime'] as number
      setPlayerState({
        currentTime: t,
        isPlaying:   payload['isPlaying'] as boolean,
        provider:    payload['provider'] as string,
        dubbing:     payload['dubbing'] as string,
      })
      localTimeRef.current = t
      setLocalTime(t)
      setIsSynced(true)
    })

    return () => {
      unsubSyncNeeded(); unsubSyncResponse(); unsubForceSync()
    }
  }, [setPlayerState, setLocalTime, setIsSynced])

  // ─── Chat messages ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubChat = wsClient.on('CHAT_MESSAGE', (payload) => {
      msgQueue.current.push({
        id:        payload['id'] as string,
        userId:    payload['userId'] as string | null,
        username:  payload['username'] as string,
        chatColor: payload['chatColor'] as string,
        content:   payload['content'] as string,
        type:      'message',
        createdAt: payload['createdAt'] as number,
      })
    })

    const unsubSystem = wsClient.on('SYSTEM_MESSAGE', (payload) => {
      msgQueue.current.push({
        id:        payload['id'] as string,
        userId:    null,
        username:  'система',
        chatColor: '#6B6870',
        content:   payload['content'] as string,
        type:      'system',
        createdAt: payload['createdAt'] as number,
      })
    })

    const unsubReaction = wsClient.on('REACTION', (payload) => {
      msgQueue.current.push({
        id:        payload['id'] as string,
        userId:    payload['userId'] as string,
        username:  payload['username'] as string,
        chatColor: payload['chatColor'] as string,
        content:   payload['emoji'] as string,
        type:      'reaction',
        createdAt: payload['createdAt'] as number,
      })
    })

    return () => { unsubChat(); unsubSystem(); unsubReaction() }
  }, [])

  // ─── Host transferred ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = wsClient.on('HOST_TRANSFERRED', (payload) => {
      const newHostId = payload['newHostId'] as string
      setIsHost(newHostId === user?.id)
    })
    return unsub
  }, [user?.id, setIsHost])

  // ─── Send local time updates every 2s ────────────────────────────────────
  const sendTimeUpdate = useCallback(() => {
    const store = useRoomStore.getState()
    wsClient.send({
      type: 'TIME_UPDATE',
      payload: {
        currentTime: store.localTime,
        isPlaying:   store.playerState.isPlaying,
      },
    })
  }, [])

  useEffect(() => {
    timeUpdateTimer.current = setInterval(sendTimeUpdate, 2000)
    return () => {
      if (timeUpdateTimer.current) clearInterval(timeUpdateTimer.current)
    }
  }, [sendTimeUpdate])
}