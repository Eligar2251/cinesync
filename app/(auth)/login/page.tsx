// app/(auth)/login/page.tsx
'use client'

import { useState, useCallback, type FormEvent } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import { Button } from '@/components/UI/Button/Button'
import { Input } from '@/components/UI/Input/Input'
import { useUserStore } from '@/store/user.store'
import styles from './login.module.css'

const EASING = [0.25, 0.46, 0.45, 0.94] as const

export default function LoginPage() {
  const { login, loginAsGuest } = useAuth()
  const { isLoading, error } = useUserStore()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const validate = useCallback(() => {
    const errs: typeof fieldErrors = {}
    if (!email.includes('@')) errs.email = 'Введите корректный email'
    if (password.length < 6)  errs.password = 'Минимум 6 символов'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }, [email, password])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!validate()) return
      try {
        await login({ email, password })
      } catch {
        // error displayed via store
      }
    },
    [login, email, password, validate]
  )

  const handleGuest = useCallback(async () => {
    try {
      await loginAsGuest()
    } catch {
      // error displayed via store
    }
  }, [loginAsGuest])

  return (
    <main className={styles.page}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: EASING }}
      >
        {/* Logo */}
        <div className={styles.logo}>
          <span className={styles.logoMark}>◈</span>
          <span className={styles.logoName}>CineSync</span>
        </div>

        <h1 className={styles.title}>Войти</h1>
        <p className={styles.subtitle}>Войдите, чтобы присоединиться к сеансу</p>

        {error && (
          <motion.div
            className={styles.errorBanner}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            placeholder="you@example.com"
            autoFocus
          />

          <div className={styles.passwordWrapper}>
            <Input
              label="Пароль"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              placeholder="••••••"
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setShowPw(!showPw)}
              aria-label={showPw ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showPw
                ? <EyeOff size={16} strokeWidth={1.5} />
                : <Eye size={16} strokeWidth={1.5} />
              }
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
          >
            Войти
          </Button>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerText}>или</span>
          <span className={styles.dividerLine} />
        </div>

        <Button
          variant="ghost"
          size="lg"
          fullWidth
          onClick={handleGuest}
          isLoading={isLoading}
        >
          Войти как гость
        </Button>

        <p className={styles.switchLink}>
          Нет аккаунта?{' '}
          <Link href="/register" className={styles.link}>
            Зарегистрироваться
          </Link>
        </p>
      </motion.div>
    </main>
  )
}