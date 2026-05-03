// app/(auth)/register/page.tsx
'use client'

import { useState, useCallback, type FormEvent } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Check, X } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import { Button } from '@/components/UI/Button/Button'
import { Input } from '@/components/UI/Input/Input'
import { useUserStore } from '@/store/user.store'
import styles from './register.module.css'

const EASING = [0.25, 0.46, 0.45, 0.94] as const

interface PasswordRule {
  label: string
  test: (pw: string) => boolean
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'Минимум 6 символов', test: (pw) => pw.length >= 6 },
  { label: 'Буква', test: (pw) => /[a-zA-Zа-яА-Я]/.test(pw) },
  { label: 'Цифра или символ', test: (pw) => /[\d!@#$%^&*]/.test(pw) },
]

export default function RegisterPage() {
  const { register, loginAsGuest } = useAuth()
  const { isLoading, error } = useUserStore()

  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [pwFocused, setPwFocused] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string
    email?: string
    password?: string
  }>({})

  const validate = useCallback(() => {
    const errs: typeof fieldErrors = {}
    if (username.trim().length < 2) errs.username = 'Минимум 2 символа'
    if (!email.includes('@'))       errs.email    = 'Введите корректный email'
    if (password.length < 6)        errs.password = 'Минимум 6 символов'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }, [username, email, password])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!validate()) return
      try {
        await register({ username: username.trim(), email, password })
      } catch {
        // error displayed via store
      }
    },
    [register, username, email, password, validate]
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
        <div className={styles.logo}>
          <span className={styles.logoMark}>◈</span>
          <span className={styles.logoName}>CineSync</span>
        </div>

        <h1 className={styles.title}>Создать аккаунт</h1>
        <p className={styles.subtitle}>Бесплатно и навсегда</p>

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
            label="Имя пользователя"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={fieldErrors.username}
            placeholder="Никита"
            autoFocus
          />

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            placeholder="you@example.com"
          />

          <div className={styles.passwordWrapper}>
            <Input
              label="Пароль"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              placeholder="••••••"
              onFocus={() => setPwFocused(true)}
              onBlur={() => setPwFocused(false)}
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

            {(pwFocused || password.length > 0) && (
              <motion.ul
                className={styles.pwRules}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(password)
                  return (
                    <li key={rule.label} className={styles.pwRule} data-ok={ok}>
                      {ok
                        ? <Check size={11} strokeWidth={2} className={styles.iconOk} />
                        : <X size={11} strokeWidth={2} className={styles.iconFail} />
                      }
                      <span>{rule.label}</span>
                    </li>
                  )
                })}
              </motion.ul>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
          >
            Зарегистрироваться
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
          Уже есть аккаунт?{' '}
          <Link href="/login" className={styles.link}>
            Войти
          </Link>
        </p>
      </motion.div>
    </main>
  )
}