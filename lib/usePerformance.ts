// lib/usePerformance.ts
'use client'

import { useEffect } from 'react'

/**
 * Dev-only performance monitor.
 * Logs FPS every 5s and warns if frame time > 16.6ms.
 */
export function usePerformanceMonitor(label: string) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    let frameCount   = 0
    let lastTime     = performance.now()
    let animFrameId: number

    const measure = (now: number) => {
      frameCount++
      const delta = now - lastTime

      if (delta >= 5000) {
        const fps = Math.round((frameCount / delta) * 1000)
        if (fps < 50) {
          console.warn(`[perf:${label}] Low FPS detected: ${fps}fps`)
        }
        frameCount = 0
        lastTime   = now
      }

      animFrameId = requestAnimationFrame(measure)
    }

    animFrameId = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(animFrameId)
  }, [label])
}