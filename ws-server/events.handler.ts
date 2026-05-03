// ws-server/events.handler.ts
import { WebSocketServer } from 'ws'
import type { AuthenticatedSocket } from './index'
import { roomManager }              from './room.manager'
import { getRoomClients, broadcast } from './index'

type EventPayload = Record<string, unknown>

// ─── Drift threshold for sync check ─────────────────────────────────────────
const SYNC_DRIFT_THRESHOLD_S = 3

function send(sock: AuthenticatedSocket, type: string, payload: unknown): void {
  if (sock.readyState === 1) { // OPEN
    sock.send(JSON.stringify({ type, payload }))
  }
}

export function handleEvent(
  sock:    AuthenticatedSocket,
  type:    string,
  payload: EventPayload,
  wss:     WebSocketServer
): void {
  switch (type) {

    // ─── JOIN_ROOM ────────────────────────────────────────────────────────
    case 'JOIN_ROOM': {
      const slug   = payload['slug'] as string
      const hostId = payload['hostId'] as string

      if (!slug) return

      sock.roomSlug = slug

      const room = roomManager.joinRoom(slug, hostId, {
        id:          sock.userId,
        username:    sock.username,
        chatColor:   sock.chatColor,
        isGuest:     sock.isGuest,
        currentTime: 0,
        isPlaying:   false,
        lastSeen:    Date.now(),
      })

      const roomClients   = getRoomClients(wss, slug)
      const isHost        = roomManager.isHost(slug, sock.userId)
      const playerState   = roomManager.getPlayerState(slug)!
      const participants  = roomManager.getParticipants(slug)

      // Send room state to the joiner
      send(sock, 'ROOM_STATE', {
        playerState,
        participants,
        isHost,
        hostId: room.hostId,
      })

      // Announce to others
      broadcast(roomClients, {
        type: 'PARTICIPANT_JOINED',
        payload: {
          id:          sock.userId,
          username:    sock.username,
          chatColor:   sock.chatColor,
          isGuest:     sock.isGuest,
          currentTime: 0,
          isPlaying:   false,
          lastSeen:    Date.now(),
        },
      }, sock.userId)

      // System message
      broadcast(roomClients, {
        type: 'SYSTEM_MESSAGE',
        payload: {
          id:        crypto.randomUUID(),
          content:   `${sock.username} присоединился`,
          createdAt: Date.now(),
        },
      }, sock.userId)

      break
    }

    // ─── PLAY ─────────────────────────────────────────────────────────────
    case 'PLAY': {
      const slug = sock.roomSlug
      if (!slug) return
      if (!roomManager.isHost(slug, sock.userId)) return

      const currentTime = (payload['currentTime'] as number) ?? 0
      roomManager.updatePlayerState(slug, { isPlaying: true, currentTime })
      roomManager.updateParticipantTime(slug, sock.userId, currentTime, true)

      broadcast(getRoomClients(wss, slug), {
        type: 'PLAY',
        payload: { currentTime },
      }, sock.userId)

      break
    }

    // ─── PAUSE ────────────────────────────────────────────────────────────
    case 'PAUSE': {
      const slug = sock.roomSlug
      if (!slug) return
      if (!roomManager.isHost(slug, sock.userId)) return

      const currentTime = (payload['currentTime'] as number) ?? 0
      roomManager.updatePlayerState(slug, { isPlaying: false, currentTime })
      roomManager.updateParticipantTime(slug, sock.userId, currentTime, false)

      broadcast(getRoomClients(wss, slug), {
        type: 'PAUSE',
        payload: { currentTime },
      }, sock.userId)

      break
    }

    // ─── SEEK ─────────────────────────────────────────────────────────────
    case 'SEEK': {
      const slug = sock.roomSlug
      if (!slug) return
      if (!roomManager.isHost(slug, sock.userId)) return

      const currentTime = (payload['currentTime'] as number) ?? 0
      roomManager.updatePlayerState(slug, { currentTime })
      roomManager.updateParticipantTime(slug, sock.userId, currentTime, false)

      broadcast(getRoomClients(wss, slug), {
        type: 'SEEK',
        payload: { currentTime },
      }, sock.userId)

      break
    }

    // ─── TIME_UPDATE (participant reports their current time) ─────────────
    case 'TIME_UPDATE': {
      const slug = sock.roomSlug
      if (!slug) return

      const currentTime = (payload['currentTime'] as number) ?? 0
      const isPlaying   = (payload['isPlaying'] as boolean) ?? false

      roomManager.updateParticipantTime(slug, sock.userId, currentTime, isPlaying)

      // Broadcast updated time to all (for time tracker display)
      broadcast(getRoomClients(wss, slug), {
        type: 'PARTICIPANT_TIME_UPDATE',
        payload: { userId: sock.userId, currentTime, isPlaying },
      }, sock.userId)

      // Auto-sync check: if viewer drifted > threshold, flag as out of sync
      const hostState = roomManager.getPlayerState(slug)
      if (hostState && !roomManager.isHost(slug, sock.userId)) {
        const drift = Math.abs(hostState.currentTime - currentTime)
        if (drift > SYNC_DRIFT_THRESHOLD_S) {
          send(sock, 'SYNC_NEEDED', {
            hostTime: hostState.currentTime,
            yourTime: currentTime,
            drift,
          })
        }
      }

      break
    }

    // ─── CHANGE_PROVIDER ──────────────────────────────────────────────────
    case 'CHANGE_PROVIDER': {
      const slug = sock.roomSlug
      if (!slug) return
      if (!roomManager.isHost(slug, sock.userId)) return

      const provider    = payload['provider'] as string
      const currentTime = (payload['currentTime'] as number) ?? 0

      roomManager.updatePlayerState(slug, { provider, currentTime })

      broadcast(getRoomClients(wss, slug), {
        type: 'CHANGE_PROVIDER',
        payload: { provider, currentTime },
      }, sock.userId)

      break
    }

    // ─── CHANGE_DUBBING ───────────────────────────────────────────────────
    case 'CHANGE_DUBBING': {
      const slug = sock.roomSlug
      if (!slug) return
      if (!roomManager.isHost(slug, sock.userId)) return

      const dubbing = payload['dubbing'] as string
      roomManager.updatePlayerState(slug, { dubbing })

      broadcast(getRoomClients(wss, slug), {
        type: 'CHANGE_DUBBING',
        payload: { dubbing },
      }, sock.userId)

      break
    }

    // ─── CHANGE_MOVIE ─────────────────────────────────────────────────────
    case 'CHANGE_MOVIE': {
      const slug = sock.roomSlug
      if (!slug) return
      if (!roomManager.isHost(slug, sock.userId)) return

      const kpId       = payload['kpId']       as string
      const movieTitle = payload['movieTitle'] as string
      const posterUrl  = payload['posterUrl']  as string
      const provider   = payload['provider']   as string

      roomManager.updatePlayerState(slug, {
        currentTime: 0,
        isPlaying:   false,
        provider,
      })

      broadcast(getRoomClients(wss, slug), {
        type: 'CHANGE_MOVIE',
        payload: { kpId, movieTitle, posterUrl, provider },
      })

      break
    }

    // ─── CHAT_MESSAGE ─────────────────────────────────────────────────────
    case 'CHAT_MESSAGE': {
      const slug = sock.roomSlug
      if (!slug) return

      const content = ((payload['content'] as string) ?? '').trim()
      if (!content || content.length > 500) return

      const msg = {
        id:        crypto.randomUUID(),
        userId:    sock.userId,
        username:  sock.username,
        chatColor: sock.chatColor,
        content,
        type:      'message' as const,
        createdAt: Date.now(),
      }

      broadcast(getRoomClients(wss, slug), {
        type:    'CHAT_MESSAGE',
        payload: msg,
      })

      break
    }

    // ─── REACTION ─────────────────────────────────────────────────────────
    case 'REACTION': {
      const slug = sock.roomSlug
      if (!slug) return

      const emoji = (payload['emoji'] as string) ?? ''
      if (!emoji) return

      broadcast(getRoomClients(wss, slug), {
        type: 'REACTION',
        payload: {
          id:        crypto.randomUUID(),
          userId:    sock.userId,
          username:  sock.username,
          chatColor: sock.chatColor,
          emoji,
          createdAt: Date.now(),
        },
      })

      break
    }

    // ─── SYNC_REQUEST ─────────────────────────────────────────────────────
    case 'SYNC_REQUEST': {
      const slug = sock.roomSlug
      if (!slug) return

      const playerState = roomManager.getPlayerState(slug)
      if (!playerState) return

      // Send current state to requester
      send(sock, 'SYNC_RESPONSE', {
        currentTime: playerState.currentTime,
        isPlaying:   playerState.isPlaying,
        provider:    playerState.provider,
        dubbing:     playerState.dubbing,
      })

      // If host requests sync, push state to ALL participants
      if (roomManager.isHost(slug, sock.userId)) {
        broadcast(getRoomClients(wss, slug), {
          type: 'FORCE_SYNC',
          payload: {
            currentTime: playerState.currentTime,
            isPlaying:   playerState.isPlaying,
            provider:    playerState.provider,
            dubbing:     playerState.dubbing,
          },
        }, sock.userId)
      }

      break
    }

    // ─── TRANSFER_HOST ────────────────────────────────────────────────────
    case 'TRANSFER_HOST': {
      const slug      = sock.roomSlug
      if (!slug) return
      if (!roomManager.isHost(slug, sock.userId)) return

      const newHostId = payload['newHostId'] as string
      const success   = roomManager.transferHost(slug, newHostId)

      if (success) {
        broadcast(getRoomClients(wss, slug), {
          type:    'HOST_TRANSFERRED',
          payload: { newHostId },
        })
      }

      break
    }

    default:
      break
  }
}