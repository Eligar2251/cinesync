// store/user.store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface User {
  id: string
  username: string
  email?: string
  avatarUrl: string | null
  chatColor: string
  isGuest: boolean
}

interface UserState {
  user: User | null
  isLoading: boolean
  error: string | null

  setUser: (user: User) => void
  clearUser: () => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  updateColor: (color: string) => void
  updateUsername: (username: string) => void
  updateAvatar: (url: string) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, error: null }),
      clearUser: () => set({ user: null }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      updateColor: (chatColor) =>
        set((state) =>
          state.user ? { user: { ...state.user, chatColor } } : {}
        ),

      updateUsername: (username) =>
        set((state) =>
          state.user ? { user: { ...state.user, username } } : {}
        ),

      updateAvatar: (avatarUrl) =>
        set((state) =>
          state.user ? { user: { ...state.user, avatarUrl } } : {}
        ),
    }),
    {
      name: 'cinesync-user',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
)