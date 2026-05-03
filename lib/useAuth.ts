// lib/useAuth.ts
'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/store/user.store'
import type { User } from '@/store/user.store'

interface LoginPayload {
  email: string
  password: string
}

interface RegisterPayload {
  username: string
  email: string
  password: string
}

interface AuthResponse {
  user: User
}

export function useAuth() {
  const router = useRouter()
  const { setUser, clearUser, setLoading, setError, user } = useUserStore()

  const login = useCallback(
    async (payload: LoginPayload) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = (await res.json()) as AuthResponse & { error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Ошибка входа')
        setUser(data.user)
        router.push('/')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [setUser, setLoading, setError, router]
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = (await res.json()) as AuthResponse & { error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Ошибка регистрации')
        setUser(data.user)
        router.push('/')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [setUser, setLoading, setError, router]
  )

  const loginAsGuest = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/guest', { method: 'POST' })
      const data = (await res.json()) as AuthResponse & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Ошибка гостевого входа')
      setUser(data.user)
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
      throw err
    } finally {
      setLoading(false)
    }
  }, [setUser, setLoading, setError, router])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    clearUser()
    router.push('/login')
  }, [clearUser, router])

  return { user, login, register, loginAsGuest, logout }
}