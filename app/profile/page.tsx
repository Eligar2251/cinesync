// app/profile/page.tsx
'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronLeft, LogOut } from 'lucide-react'
import { ProfileForm } from '@/components/Profile/ProfileForm'
import { useAuth }     from '@/lib/useAuth'
import { useUserStore } from '@/store/user.store'
import styles from './profile.module.css'

const EASING = [0.25, 0.46, 0.45, 0.94] as const

export default function ProfilePage() {
  const { logout } = useAuth()
  const { user }   = useUserStore()

  const handleLogout = useCallback(async () => {
    await logout()
  }, [logout])

  return (
    <div className={styles.page}>
      {/* Top nav */}
      <header className={styles.header}>
        <Link href="/search" className={styles.back}>
          <ChevronLeft size={16} strokeWidth={1.5} />
          Назад
        </Link>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={14} strokeWidth={1.5} />
          Выйти
        </button>
      </header>

      <motion.main
        className={styles.main}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASING }}
      >
        <ProfileForm />
      </motion.main>
    </div>
  )
}