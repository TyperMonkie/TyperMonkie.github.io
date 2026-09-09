import { useEffect, useRef } from 'react'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

function ParticleCar({ isLight }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!container || !canvas || !context) return undefined

    let particles = []
    let frame = 0
    let resizeFrame = 0
    let width = 0
    let height = 0
    let dpr = 1
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pointer = { active: false, x: 0, y: 0, smoothX: 0, smoothY: 0 }
    const image = new Image()

    const build = () => {
      const rect = container.getBoundingClientRect()
      width = Math.max(1, Math.floor(rect.width))
      height = Math.max(1, Math.floor(rect.height))
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!image.complete || !image.naturalWidth) return

      const sample = document.createElement('canvas')
      const sampleContext = sample.getContext('2d', { willReadFrequently: true })
      const targetWidth = Math.min(width * .82, 1120)
      const targetHeight = Math.min(height * .79, 680)
      const scale = Math.min(targetWidth / image.naturalWidth, targetHeight / image.naturalHeight)
      sample.width = Math.max(1, Math.round(image.naturalWidth * scale))
      sample.height = Math.max(1, Math.round(image.naturalHeight * scale))
      sampleContext.drawImage(image, 0, 0, sample.width, sample.height)
      const pixels = sampleContext.getImageData(0, 0, sample.width, sample.height).data
      const step = width < 720 ? 5 : 4
      const offsetX = (width - sample.width) / 2
      const offsetY = (height - sample.height) / 2 + height * .09
      const next = []

      for (let y = 0; y < sample.height; y += step) {
        for (let x = 0; x < sample.width; x += step) {
          const index = (y * sample.width + x) * 4
          const r = pixels[index]
          const g = pixels[index + 1]
          const b = pixels[index + 2]
          const luminance = r * .299 + g * .587 + b * .114
          const orange = r > 180 && g > 60 && g < 190 && b < 100
          if (luminance < 116 || orange) {
            const seed = ((next.length * 9301 + 49297) % 233280) / 233280
            const targetX = offsetX + x
            const targetY = offsetY + y
            const angle = seed * Math.PI * 2
            const distance = 90 + seed * 220
            next.push({
              x: reducedMotion ? targetX : targetX + Math.cos(angle) * distance,
              y: reducedMotion ? targetY : targetY + Math.sin(angle) * distance,
              targetX,
              targetY,
              seed,
              size: orange ? 1.75 : .75 + seed * 1.25,
              accent: orange,
            })
          }
        }
      }
      particles = next.length > 5200 ? next.filter((_, index) => index % Math.ceil(next.length / 5200) === 0) : next
      pointer.x = pointer.smoothX = width / 2
      pointer.y = pointer.smoothY = height / 2
    }

    const render = time => {
      context.clearRect(0, 0, width, height)
      const rootStyles = getComputedStyle(document.documentElement)
      const particleColor = rootStyles.getPropertyValue('--particle')
      const accentColor = rootStyles.getPropertyValue('--particle-hot')
      pointer.smoothX += (pointer.x - pointer.smoothX) * .12
      pointer.smoothY += (pointer.y - pointer.smoothY) * .12
      const progress = reducedMotion ? 1 : clamp((time - 180) / 2200, 0, 1)
      const ease = 1 - Math.pow(1 - progress, 4)

      for (const particle of particles) {
        let targetX = particle.targetX
        let targetY = particle.targetY
        if (!reducedMotion) {
          targetX += Math.sin(time * .00045 + particle.seed * 20) * (1.4 + particle.seed * 2.2)
          targetY += Math.cos(time * .00038 + particle.seed * 16) * (1.1 + particle.seed * 1.9)
        }
        let baseX = particle.x + (targetX - particle.x) * (.025 + ease * .07)
        let baseY = particle.y + (targetY - particle.y) * (.025 + ease * .07)

        if (pointer.active && !reducedMotion) {
          const dx = baseX - pointer.smoothX
          const dy = baseY - pointer.smoothY
          const distance = Math.hypot(dx, dy)
          if (distance > 0 && distance < 110) {
            const force = Math.pow(1 - distance / 110, 2) * 36
            baseX += dx / distance * force
            baseY += dy / distance * force
          }
        }
        particle.x = baseX
        particle.y = baseY
        context.globalAlpha = particle.accent ? .86 : .18 + particle.seed * .46
        context.fillStyle = particle.accent ? accentColor : particleColor
        context.beginPath()
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        context.fill()
      }
      context.globalAlpha = 1
      frame = requestAnimationFrame(render)
    }

    const onPointerMove = event => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = event.clientX - rect.left
      pointer.y = event.clientY - rect.top
      pointer.active = true
    }
    const onPointerLeave = () => { pointer.active = false }
    const queueBuild = () => {
      cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(build)
    }

    image.onload = build
    image.src = '/reference-car.png'
    const observer = new ResizeObserver(queueBuild)
    observer.observe(container)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerleave', onPointerLeave)
    frame = requestAnimationFrame(render)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      cancelAnimationFrame(resizeFrame)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [isLight])

  return <div ref={containerRef} className="particle-car" aria-hidden="true"><canvas ref={canvasRef} /></div>
}

export default ParticleCar
