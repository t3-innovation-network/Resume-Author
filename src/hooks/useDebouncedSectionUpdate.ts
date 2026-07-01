import { useCallback, useEffect, useRef } from 'react'
import { registerSectionFlush } from '../utils/sectionUpdateFlush'

export function useDebouncedSectionUpdate<T>(
  dispatchUpdate: (value: T) => void,
  delay = 500
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<T | undefined>(undefined)
  const dispatchRef = useRef(dispatchUpdate)
  dispatchRef.current = dispatchUpdate

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (pendingRef.current !== undefined) {
      const value = pendingRef.current
      pendingRef.current = undefined
      dispatchRef.current(value)
    }
  }, [])

  const scheduleUpdate = useCallback(
    (value: T) => {
      pendingRef.current = value
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        if (pendingRef.current !== undefined) {
          dispatchRef.current(pendingRef.current)
          pendingRef.current = undefined
        }
      }, delay)
    },
    [delay]
  )

  const cancelPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    pendingRef.current = undefined
  }, [])

  useEffect(() => {
    return registerSectionFlush(flush)
  }, [flush])

  useEffect(() => {
    return () => flush()
  }, [flush])

  return { scheduleUpdate, flush, cancelPending }
}
