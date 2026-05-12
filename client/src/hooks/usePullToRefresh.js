import { useRef, useState, useEffect } from 'react'

const THRESHOLD = 64
const MAX_PULL  = 80

export function usePullToRefresh(onRefresh) {
  const containerRef    = useRef(null)
  const onRefreshRef    = useRef(onRefresh)
  const startY          = useRef(0)
  const pulling         = useRef(false)
  const pullDistRef     = useRef(0)
  const isRefreshingRef = useRef(false)

  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Keep callback ref current without re-attaching listeners
  useEffect(() => { onRefreshRef.current = onRefresh }, [onRefresh])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onTouchStart(e) {
      startY.current  = e.touches[0].clientY
      pulling.current = true
    }

    function onTouchMove(e) {
      if (!pulling.current || isRefreshingRef.current) return
      const currentY = e.touches[0].clientY
      if (el.scrollTop > 0) {
        // Keep startY current so delta is measured from where scroll topped out
        startY.current = currentY
        return
      }
      const delta = currentY - startY.current
      if (delta <= 0) {
        pulling.current  = false
        pullDistRef.current = 0
        setPullDistance(0)
        return
      }
      e.preventDefault()
      const dist = Math.min(delta * 0.5, MAX_PULL)
      pullDistRef.current = dist
      setPullDistance(dist)
    }

    async function onTouchEnd() {
      if (!pulling.current) return
      pulling.current = false
      const dist = pullDistRef.current
      pullDistRef.current = 0

      if (dist >= THRESHOLD && !isRefreshingRef.current) {
        isRefreshingRef.current = true
        setIsRefreshing(true)
        setPullDistance(0)
        try {
          await onRefreshRef.current()
        } finally {
          isRefreshingRef.current = false
          setIsRefreshing(false)
        }
      } else {
        setPullDistance(0)
      }
      startY.current = 0
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    el.addEventListener('touchend',   onTouchEnd,   { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, []) // listeners attached once; callback kept current via ref

  return { ref: containerRef, pullDistance, isRefreshing }
}
