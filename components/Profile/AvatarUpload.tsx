// components/Profile/AvatarUpload.tsx
'use client'

import {
  useState,
  useRef,
  useCallback,
  type DragEvent,
  type ChangeEvent,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Check } from 'lucide-react'
import styles from './AvatarUpload.module.css'

interface AvatarUploadProps {
  currentUrl:  string | null
  username:    string
  chatColor:   string
  onUpload:    (url: string) => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED      = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const EASING        = [0.25, 0.46, 0.45, 0.94] as const

export function AvatarUpload({
  currentUrl,
  username,
  chatColor,
  onUpload,
}: AvatarUploadProps) {
  const [preview, setPreview]   = useState<string | null>(currentUrl)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const inputRef                = useRef<HTMLInputElement>(null)

  const processFile = useCallback(
    async (file: File) => {
      setError('')

      if (!ACCEPTED.includes(file.type)) {
        setError('Только JPEG, PNG, WebP или GIF')
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setError('Максимальный размер файла — 5 МБ')
        return
      }

      // Immediate local preview
      const objectUrl = URL.createObjectURL(file)
      setPreview(objectUrl)
      setIsUploading(true)

      try {
        const formData = new FormData()
        formData.append('avatar', file)

        const res  = await fetch('/api/profile/avatar', {
          method: 'POST',
          body:   formData,
        })
        const data = await res.json() as { url?: string; error?: string }

        if (!res.ok) throw new Error(data.error ?? 'Ошибка загрузки')

        onUpload(data.url!)
        setPreview(data.url!)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2500)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки')
        setPreview(currentUrl)
      } finally {
        setIsUploading(false)
        URL.revokeObjectURL(objectUrl)
      }
    },
    [currentUrl, onUpload]
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      e.target.value = ''
    },
    [processFile]
  )

  const handleRemove = useCallback(async () => {
    setPreview(null)
    onUpload('')
    try {
      await fetch('/api/profile/avatar', { method: 'DELETE' })
    } catch {
      // best-effort
    }
  }, [onUpload])

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.dropZone}
        data-dragging={isDragging}
        data-uploading={isUploading}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Загрузить аватар"
        onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click() }}
      >
        {/* Current avatar or placeholder */}
        {preview ? (
          <img
            src={preview}
            alt={username}
            className={styles.avatar}
          />
        ) : (
          <div
            className={styles.placeholder}
            style={{ background: chatColor + '22', borderColor: chatColor + '44' }}
          >
            <span style={{ color: chatColor }} className={styles.placeholderInitial}>
              {username.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}

        {/* Overlay on hover */}
        <div className={styles.overlay}>
          {isUploading ? (
            <div className={styles.spinner} />
          ) : success ? (
            <Check size={20} strokeWidth={2} className={styles.overlayIcon} />
          ) : (
            <Upload size={18} strokeWidth={1.5} className={styles.overlayIcon} />
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className={styles.hiddenInput}
          onChange={handleInputChange}
          aria-hidden="true"
        />
      </div>

      <div className={styles.info}>
        <p className={styles.infoText}>
          JPEG, PNG, WebP, GIF — до 5 МБ
        </p>
        <p className={styles.infoHint}>
          Перетащите файл или нажмите для выбора
        </p>
        {preview && !isUploading && (
          <button className={styles.removeBtn} onClick={handleRemove}>
            <X size={12} strokeWidth={2} />
            Удалить фото
          </button>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            className={styles.error}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: EASING }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}