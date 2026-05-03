// components/Profile/ProfileForm.tsx
'use client'

import {
  useState,
  useCallback,
  type FormEvent,
} from 'react'
import { motion } from 'framer-motion'
import { Save, KeyRound, Check } from 'lucide-react'
import { AvatarUpload } from './AvatarUpload'
import { ColorPicker } from './ColorPicker'
import { Input } from '@/components/UI/Input/Input'
import { Button } from '@/components/UI/Button/Button'
import { useUserStore } from '@/store/user.store'
import styles from './ProfileForm.module.css'

const EASING = [0.25, 0.46, 0.45, 0.94] as const

export function ProfileForm() {
  const { user, updateUsername, updateColor, updateAvatar } = useUserStore()

  const [username, setUsername]     = useState(user?.username ?? '')
  const [usernameError, setUsernameError] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved]     = useState(false)

  const [currentPw, setCurrentPw]   = useState('')
  const [newPw, setNewPw]           = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [pwError, setPwError]       = useState('')
  const [isSavingPw, setIsSavingPw] = useState(false)
  const [pwSaved, setPwSaved]       = useState(false)

  const [globalError, setGlobalError] = useState('')

  const handleProfileSave = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setUsernameError('')
      setGlobalError('')

      if (username.trim().length < 2) {
        setUsernameError('Минимум 2 символа')
        return
      }

      setIsSavingProfile(true)
      try {
        const res = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim() }),
        })
        const data = await res.json() as { error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Ошибка сохранения')

        updateUsername(username.trim())
        setProfileSaved(true)
        setTimeout(() => setProfileSaved(false), 2500)
      } catch (err) {
        setGlobalError(err instanceof Error ? err.message : 'Ошибка')
      } finally {
        setIsSavingProfile(false)
      }
    },
    [username, updateUsername]
  )

  const handleColorChange = useCallback(
    async (color: string) => {
      updateColor(color)
      try {
        await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatColor: color }),
        })
      } catch {
        // Optimistic — UI already updated
      }
    },
    [updateColor]
  )

  const handlePasswordSave = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setPwError('')

      if (!currentPw) { setPwError('Введите текущий пароль'); return }
      if (newPw.length < 6) { setPwError('Минимум 6 символов'); return }
      if (newPw !== confirmPw) { setPwError('Пароли не совпадают'); return }
      if (user?.isGuest) { setPwError('Гостям нельзя менять пароль'); return }

      setIsSavingPw(true)
      try {
        const res = await fetch('/api/profile/password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
        })
        const data = await res.json() as { error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Ошибка смены пароля')

        setCurrentPw('')
        setNewPw('')
        setConfirmPw('')
        setPwSaved(true)
        setTimeout(() => setPwSaved(false), 2500)
      } catch (err) {
        setPwError(err instanceof Error ? err.message : 'Ошибка')
      } finally {
        setIsSavingPw(false)
      }
    },
    [currentPw, newPw, confirmPw, user?.isGuest]
  )

  if (!user) return null

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Профиль</h1>
        {user.isGuest && (
          <div className={styles.guestBanner}>
            Вы вошли как гость. Зарегистрируйтесь, чтобы сохранить прогресс.
          </div>
        )}
      </div>

      {globalError && (
        <motion.div
          className={styles.errorBanner}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASING }}
        >
          {globalError}
        </motion.div>
      )}

      {/* Avatar */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Аватар</h2>
        <AvatarUpload
          currentUrl={user.avatarUrl}
          username={user.username}
          chatColor={user.chatColor}
          onUpload={updateAvatar}
        />
      </section>

      <div className={styles.divider} />

      {/* Username */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Имя пользователя</h2>
        <form onSubmit={handleProfileSave} className={styles.form}>
          <Input
            label="Имя"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={usernameError}
            placeholder="Никита"
            hint="Отображается в чате и списке участников"
          />
          <div className={styles.formActions}>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSavingProfile}
            >
              {profileSaved ? (
                <>
                  <Check size={14} strokeWidth={2} />
                  Сохранено
                </>
              ) : (
                <>
                  <Save size={14} strokeWidth={1.5} />
                  Сохранить
                </>
              )}
            </Button>
          </div>
        </form>
      </section>

      <div className={styles.divider} />

      {/* Chat color */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Цвет ника в чате</h2>
        <p className={styles.sectionDesc}>
          Этот цвет будет использоваться для вашего имени в чате.
        </p>
        <ColorPicker
          current={user.chatColor}
          onChange={handleColorChange}
        />
        {/* Preview */}
        <div className={styles.colorPreview}>
          <span style={{ color: user.chatColor }} className={styles.previewUsername}>
            {user.username}
          </span>
          <span className={styles.previewMsg}>Привет! Как дела?</span>
        </div>
      </section>

      {!user.isGuest && (
        <>
          <div className={styles.divider} />

          {/* Password */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Сменить пароль</h2>
            <form onSubmit={handlePasswordSave} className={styles.form}>
              <Input
                label="Текущий пароль"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••"
                autoComplete="current-password"
              />
              <Input
                label="Новый пароль"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="••••••"
                hint="Минимум 6 символов"
                autoComplete="new-password"
              />
              <Input
                label="Повторите новый пароль"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="••••••"
                error={pwError}
                autoComplete="new-password"
              />
              <div className={styles.formActions}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="md"
                  isLoading={isSavingPw}
                >
                  {pwSaved ? (
                    <>
                      <Check size={14} strokeWidth={2} />
                      Пароль изменён
                    </>
                  ) : (
                    <>
                      <KeyRound size={14} strokeWidth={1.5} />
                      Изменить пароль
                    </>
                  )}
                </Button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  )
}