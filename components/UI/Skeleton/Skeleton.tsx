// components/UI/Skeleton/Skeleton.tsx
import styles from './Skeleton.module.css'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string
  className?: string
}

export function Skeleton({ width, height, borderRadius, className = '' }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={{
        width:  width  !== undefined ? (typeof width  === 'number' ? `${width}px`  : width)  : undefined,
        height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
        borderRadius,
      }}
      aria-hidden="true"
    />
  )
}

export function MovieCardSkeleton() {
  return (
    <div className={styles.cardSkeleton}>
      <Skeleton height="210px" borderRadius="4px" />
      <Skeleton height="13px" width="85%" borderRadius="3px" />
      <Skeleton height="11px" width="40%" borderRadius="3px" />
    </div>
  )
}

export function MovieRowSkeleton() {
  return (
    <div className={styles.rowSkeleton}>
      <Skeleton height="14px" width="140px" borderRadius="3px" />
      <div className={styles.rowCards}>
        {Array.from({ length: 8 }).map((_, i) => (
          <MovieCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}