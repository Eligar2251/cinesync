// ws-server/room.manager.ts

export interface RoomParticipant {
  id:        string
  username:  string
  chatColor: string
  isGuest:   boolean
  currentTime: number
  isPlaying:   boolean
  lastSeen:    number
}

export interface RoomPlayerState {
  provider:    string
  dubbing:     string
  currentTime: number
  isPlaying:   boolean
  updatedAt:   number
}

export interface Room {
  slug:         string
  hostId:       string
  participants: RoomParticipant[]
  playerState:  RoomPlayerState
  createdAt:    number
}

class RoomManager {
  private rooms = new Map<string, Room>()

  // ─── Room lifecycle ────────────────────────────────────────────────────────
  ensureRoom(slug: string, hostId: string): Room {
    if (!this.rooms.has(slug)) {
      this.rooms.set(slug, {
        slug,
        hostId,
        participants: [],
        playerState: {
          provider:    'alloha',
          dubbing:     'Дубляж',
          currentTime: 0,
          isPlaying:   false,
          updatedAt:   Date.now(),
        },
        createdAt: Date.now(),
      })
    }
    return this.rooms.get(slug)!
  }

  getRoom(slug: string): Room | undefined {
    return this.rooms.get(slug)
  }

  deleteRoom(slug: string): void {
    this.rooms.delete(slug)
  }

  // ─── Participants ──────────────────────────────────────────────────────────
  joinRoom(
    slug:      string,
    hostId:    string,
    participant: RoomParticipant
  ): Room {
    const room = this.ensureRoom(slug, hostId)

    // Remove stale entry if reconnecting
    room.participants = room.participants.filter((p) => p.id !== participant.id)
    room.participants.push({ ...participant, lastSeen: Date.now() })

    return room
  }

  leaveRoom(slug: string, userId: string): void {
    const room = this.rooms.get(slug)
    if (!room) return

    room.participants = room.participants.filter((p) => p.id !== userId)

    // Clean up empty rooms after 5 minutes
    if (room.participants.length === 0) {
      setTimeout(() => {
        const r = this.rooms.get(slug)
        if (r && r.participants.length === 0) {
          this.rooms.delete(slug)
        }
      }, 5 * 60 * 1000)
    }
  }

  updateParticipantTime(
    slug:   string,
    userId: string,
    time:   number,
    isPlaying: boolean
  ): void {
    const room = this.rooms.get(slug)
    if (!room) return
    const p = room.participants.find((x) => x.id === userId)
    if (p) {
      p.currentTime = time
      p.isPlaying   = isPlaying
      p.lastSeen    = Date.now()
    }
  }

  transferHost(slug: string, newHostId: string): boolean {
    const room = this.rooms.get(slug)
    if (!room) return false
    const exists = room.participants.some((p) => p.id === newHostId)
    if (!exists) return false
    room.hostId = newHostId
    return true
  }

  // ─── Player state ──────────────────────────────────────────────────────────
  updatePlayerState(slug: string, patch: Partial<RoomPlayerState>): RoomPlayerState | null {
    const room = this.rooms.get(slug)
    if (!room) return null
    room.playerState = {
      ...room.playerState,
      ...patch,
      updatedAt: Date.now(),
    }
    return room.playerState
  }

  getPlayerState(slug: string): RoomPlayerState | null {
    return this.rooms.get(slug)?.playerState ?? null
  }

  getParticipants(slug: string): RoomParticipant[] {
    return this.rooms.get(slug)?.participants ?? []
  }

  isHost(slug: string, userId: string): boolean {
    return this.rooms.get(slug)?.hostId === userId
  }

  getRoomCount(): number {
    return this.rooms.size
  }
}

export const roomManager = new RoomManager()