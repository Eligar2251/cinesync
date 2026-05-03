// store/room.store.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface Participant {
  id:          string
  username:    string
  chatColor:   string
  avatarUrl:   string | null
  isHost:      boolean
  currentTime: number
  isPlaying:   boolean
  lastSeen:    number
}

export interface PlayerState {
  provider:    string
  dubbing:     string
  currentTime: number
  isPlaying:   boolean
  updatedAt:   number
}

export interface ChatMessage {
  id:        string
  userId:    string | null
  username:  string
  chatColor: string
  content:   string
  type:      'message' | 'system' | 'reaction'
  createdAt: number
}

export interface RoomInfo {
  id:         string
  slug:       string
  title:      string
  hostId:     string
  isPublic:   boolean
  kpId:       string | null
  movieTitle: string | null
  posterUrl:  string | null
}

interface RoomState {
  room:         RoomInfo | null
  participants: Participant[]
  playerState:  PlayerState
  messages:     ChatMessage[]
  isHost:       boolean
  isSynced:     boolean
  localTime:    number
  isConnected:  boolean

  setRoom:                (room: RoomInfo) => void
  setParticipants:        (participants: Participant[]) => void
  addParticipant:         (p: Participant) => void
  removeParticipant:      (id: string) => void
  updateParticipantTime:  (id: string, time: number) => void
  setPlayerState:         (state: Partial<PlayerState>) => void
  addMessage:             (msg: ChatMessage) => void
  addMessages:            (msgs: ChatMessage[]) => void
  setIsHost:              (v: boolean) => void
  setIsSynced:            (v: boolean) => void
  setLocalTime:           (t: number) => void
  setConnected:           (v: boolean) => void
  clearRoom:              () => void
}

const DEFAULT_PLAYER: PlayerState = {
  provider:    'alloha',
  dubbing:     'Дубляж',
  currentTime: 0,
  isPlaying:   false,
  updatedAt:   0,
}

export const useRoomStore = create<RoomState>()(
  subscribeWithSelector((set) => ({
    room:         null,
    participants: [],
    playerState:  { ...DEFAULT_PLAYER },
    messages:     [],
    isHost:       false,
    isSynced:     true,
    localTime:    0,
    isConnected:  false,

    setRoom: (room) => set({ room }),

    setParticipants: (participants) => set({ participants }),

    addParticipant: (p) =>
      set((s) => ({
        participants: s.participants.some((x) => x.id === p.id)
          ? s.participants
          : [...s.participants, p],
      })),

    removeParticipant: (id) =>
      set((s) => ({
        participants: s.participants.filter((p) => p.id !== id),
      })),

    updateParticipantTime: (id, time) =>
      set((s) => ({
        participants: s.participants.map((p) =>
          p.id === id
            ? { ...p, currentTime: time, lastSeen: Date.now() }
            : p
        ),
      })),

    setPlayerState: (state) =>
      set((s) => ({
        playerState: { ...s.playerState, ...state },
      })),

    addMessage: (msg) =>
      set((s) => {
        const msgs = [...s.messages, msg]
        return { messages: msgs.length > 500 ? msgs.slice(-500) : msgs }
      }),

    addMessages: (msgs) =>
      set((s) => ({
        messages: [...s.messages, ...msgs].slice(-500),
      })),

    setIsHost:    (isHost)      => set({ isHost }),
    setIsSynced:  (isSynced)    => set({ isSynced }),
    setLocalTime: (localTime)   => set({ localTime }),
    setConnected: (isConnected) => set({ isConnected }),

    clearRoom: () =>
      set({
        room:         null,
        participants: [],
        playerState:  { ...DEFAULT_PLAYER },
        messages:     [],
        isHost:       false,
        isSynced:     true,
        localTime:    0,
        isConnected:  false,
      }),
  }))
)