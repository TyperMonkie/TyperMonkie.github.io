import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const MAX_PIXELS = 220
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const noise = seed => { const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value) }
const patterns = {
  random: () => null,
  center: (x, y) => Math.hypot(x - .5, y - .5) / Math.SQRT1_2,
  edges: (x, y) => Math.min(x, 1 - x, y, 1 - y) * 2,
  diagonal: (x, y) => (x + y) / 2,
}

function PixelSwap({ firstContent, secondContent, pixelSize = 64, gap = 0, pixelRadius = 0, pixelScale = .35, fade = true, duration = 1400, pixelDuration = 450, pattern = 'random', randomness = 0, trigger = 'hover', initialActive = false, active, onActiveChange, aspectRatio = '16 / 10', className = '' }) {
  const [internalActive, setInternalActive] = useState(initialActive)
  const [shownActive, setShownActive] = useState(active ?? initialActive)
  const [transition, setTransition] = useState(null)
  const [box, setBox] = useState({ width: 0, height: 0 })
  const containerRef = useRef(null)
  const layerRefs = useRef([])
  const timerRef = useRef(0)
  const desiredActive = active ?? internalActive

  const grid = useMemo(() => {
    let size = Math.max(8, Math.round(pixelSize))
    let columns = Math.max(1, Math.ceil((box.width + gap) / (size + gap)))
    let rows = Math.max(1, Math.ceil((box.height + gap) / (size + gap)))
    if (columns * rows > MAX_PIXELS) {
      size = Math.ceil(size * Math.sqrt((columns * rows) / MAX_PIXELS))
      columns = Math.max(1, Math.ceil((box.width + gap) / (size + gap)))
      rows = Math.max(1, Math.ceil((box.height + gap) / (size + gap)))
    }
    const stride = size + gap
    const originX = (box.width - (columns * stride - gap)) / 2
    const originY = (box.height - (rows * stride - gap)) / 2
    const order = patterns[pattern] ?? patterns.random
    return Array.from({ length: columns * rows }, (_, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = columns <= 1 ? .5 : column / (columns - 1)
      const y = rows <= 1 ? .5 : row / (rows - 1)
      const base = order(x, y)
      return { id: index, left: originX + column * stride, top: originY + row * stride, size, delay: (base === null ? noise(index + 1) : base * (1 - randomness) + noise(index + 1) * randomness) * Math.max(0, duration - pixelDuration) }
    })
  }, [box, duration, gap, pattern, pixelDuration, pixelSize, randomness])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return undefined
    const measure = () => setBox({ width: node.clientWidth, height: node.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (transition || desiredActive === shownActive) return
    setTransition({ to: desiredActive })
  }, [desiredActive, shownActive, transition])

  useEffect(() => {
    if (!transition) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShownActive(transition.to)
      setTransition(null)
      return undefined
    }
    timerRef.current = window.setTimeout(() => {
      setShownActive(transition.to)
      setTransition(null)
    }, duration)
    return () => window.clearTimeout(timerRef.current)
  }, [duration, transition])

  const requestActive = useCallback(next => {
    if (active === undefined) setInternalActive(next)
    onActiveChange?.(next)
  }, [active, onActiveChange])

  const interaction = trigger === 'hover'
    ? { onMouseEnter: () => requestActive(true), onMouseLeave: () => requestActive(false) }
    : trigger === 'click' ? { onClick: () => requestActive(!desiredActive) } : {}

  return (
    <div ref={containerRef} className={`pixel-swap ${className}`} style={{ aspectRatio }} {...interaction}>
      {[firstContent, secondContent].map((content, index) => {
        const visible = index === (shownActive ? 1 : 0)
        return <div key={index} ref={node => { layerRefs.current[index] = node }} className="pixel-swap__layer" data-visible={visible && !transition} aria-hidden={!visible}>{content}</div>
      })}
      {transition && <div className="pixel-swap__grid" aria-hidden="true">
        {grid.map(pixel => <div key={pixel.id} className="pixel-swap__pixel" style={{ left: pixel.left, top: pixel.top, width: pixel.size, height: pixel.size, borderRadius: `${clamp(pixelRadius, 0, 50)}%`, opacity: fade ? 0 : 1, animation: `pixelReveal ${pixelDuration}ms cubic-bezier(.22,1,.36,1) ${pixel.delay}ms both`, transform: `scale(${pixelScale})` }}>
          <div className="pixel-swap__pixel-content" style={{ left: -pixel.left, top: -pixel.top, width: box.width, height: box.height }}>{transition.to ? secondContent : firstContent}</div>
        </div>)}
      </div>}
    </div>
  )
}

export default PixelSwap
