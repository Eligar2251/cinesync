// components/UI/Input/Input.tsx
'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import styles from './Input.module.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className={styles.wrapper}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            styles.input,
            error ? styles.hasError : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />
        {error && <p className={styles.error}>{error}</p>}
        {hint && !error && <p className={styles.hint}>{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'