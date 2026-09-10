import { useCallback, useEffect, useRef } from 'react'
import './ScrollExpand.css'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0 || 1e-6), 0, 1)
  return t * t * (3 - 2 * t)
}

export default function ScrollExpand({
  src = '',
  mediaType = 'image',
  poster = '',
  alt = '',
  title = '',
  scrollHint = '',
  startWidth = 48,
  startHeight = 56,
  startRadius = 24,
  endRadius = 12,
  mediaZoom = 1.28,
  scrollDistance = 1.1,
  holdDistance = 0.2,
  smoothing = 0.1,
  overlayScrim = 0.18,
  enabled = true,
  children,
  className = '',
}) {
  const rootRef = useRef(null)
  const trackRef = useRef(null)
  const stageRef = useRef(null)
  const frameRef = useRef(null)
  const mediaRef = useRef(null)
  const titleRef = useRef(null)
  const overlayRef = useRef(null)
  const scrimRef = useRef(null)
  const hintRef = useRef(null)
  const propsRef = useRef({})

  propsRef.current = {
    startWidth,
    startHeight,
    startRadius,
    endRadius,
    mediaZoom,
    scrollDistance,
    holdDistance,
    smoothing,
    overlayScrim,
    enabled,
  }

  const applyProgress = useCallback((progress) => {
    const frame = frameRef.current
    const media = mediaRef.current
    if (!frame || !media) return

    const settings = propsRef.current
    const eased = smoothstep(0, 1, progress)
    const width = settings.startWidth + (100 - settings.startWidth) * eased
    const height = settings.startHeight + (100 - settings.startHeight) * eased
    const insetX = Math.max(0, (100 - width) / 2)
    const insetY = Math.max(0, (100 - height) / 2)
    const radius = settings.startRadius + (settings.endRadius - settings.startRadius) * eased

    frame.style.clipPath = `inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${radius}px)`
    media.style.transform = `scale(${settings.mediaZoom + (1 - settings.mediaZoom) * eased})`
    media.style.opacity = `${smoothstep(0.12, 0.72, progress)}`

    if (scrimRef.current) {
      scrimRef.current.style.opacity = `${settings.overlayScrim * smoothstep(0.45, 1, progress)}`
    }
    if (titleRef.current) {
      const fade = smoothstep(0.34, 0.8, progress)
      titleRef.current.style.opacity = `${1 - fade}`
      titleRef.current.style.transform = `translate3d(0, ${-24 * fade}px, 0) scale(${1 + 0.04 * fade})`
    }
    if (hintRef.current) {
      const fade = smoothstep(0, 0.14, progress)
      hintRef.current.style.opacity = `${1 - fade}`
      hintRef.current.style.transform = `translate3d(0, ${8 * fade}px, 0)`
    }
    if (overlayRef.current) {
      const enter = smoothstep(0.72, 1, progress)
      overlayRef.current.style.opacity = `${enter}`
      overlayRef.current.style.transform = `translate3d(0, ${18 * (1 - enter)}px, 0)`
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const track = trackRef.current
    const stage = stageRef.current
    if (!root || !track || !stage) return undefined

    root.scrollTop = 0
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let animationFrame = 0
    let current = 0
    let target = 0
    let stageHeight = 0
    let running = false

    const measure = () => {
      stageHeight = root.clientHeight
      if (stageHeight <= 0) return
      const settings = propsRef.current
      stage.style.height = `${stageHeight}px`
      track.style.height = `${stageHeight * (1 + Math.max(0, settings.scrollDistance) + Math.max(0, settings.holdDistance))}px`
      stage.style.setProperty('--se-title-size', `${clamp(root.clientWidth * 0.045, 20, 42)}px`)
    }

    const readProgress = () => {
      if (!propsRef.current.enabled) return 1
      const span = stageHeight * Math.max(0.01, propsRef.current.scrollDistance)
      return clamp(root.scrollTop / span, 0, 1)
    }

    const tick = () => {
      const follow = propsRef.current.smoothing <= 0
        ? 1
        : 1 - Math.exp(-1 / (60 * propsRef.current.smoothing))
      current += (target - current) * follow
      if (Math.abs(target - current) < 0.0004) {
        current = target
        running = false
      }
      applyProgress(current)
      animationFrame = running ? requestAnimationFrame(tick) : 0
    }

    const onScroll = () => {
      target = readProgress()
      if (propsRef.current.smoothing <= 0 || reduceMotion) {
        current = target
        applyProgress(current)
        return
      }
      if (!running) {
        running = true
        animationFrame = requestAnimationFrame(tick)
      }
    }

    const onResize = () => {
      measure()
      target = readProgress()
      current = target
      applyProgress(current)
    }

    measure()
    applyProgress(0)
    root.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(root)

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame)
      root.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      resizeObserver.disconnect()
    }
  }, [applyProgress])

  const media = mediaType === 'video' ? (
    <video
      ref={mediaRef}
      className="scroll-expand__media"
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
    />
  ) : (
    <img ref={mediaRef} className="scroll-expand__media" src={src} alt={alt} draggable={false} />
  )

  return (
    <div
      ref={rootRef}
      className={`scroll-expand ${className}`.trim()}
      tabIndex="0"
      aria-label="滚动展开熊二拍摄的第一张照片"
    >
      <div ref={trackRef} className="scroll-expand__track">
        <div ref={stageRef} className="scroll-expand__stage">
          <div ref={frameRef} className="scroll-expand__frame">
            {media}
            <div ref={scrimRef} className="scroll-expand__scrim" />
            {children && (
              <div ref={overlayRef} className="scroll-expand__overlay">{children}</div>
            )}
          </div>
          {title && <div ref={titleRef} className="scroll-expand__title">{title}</div>}
          {scrollHint && <div ref={hintRef} className="scroll-expand__hint">{scrollHint}</div>}
        </div>
      </div>
    </div>
  )
}
