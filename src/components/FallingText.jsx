import { useEffect, useMemo, useRef, useState } from 'react'
import Matter from 'matter-js'
import './FallingText.css'

const FallingText = ({
  className = '',
  items = [],
  text = '',
  trigger = 'auto',
  gravity = 1,
  mouseConstraintStiffness = 0.2,
  fontSize = '1rem',
  selectedIndex = 0,
  onItemSelect,
}) => {
  const containerRef = useRef(null)
  const [effectStarted, setEffectStarted] = useState(trigger === 'auto')

  const words = useMemo(() => {
    if (items.length) return items
    return text.split(' ').filter(Boolean).map((label, index) => ({ id: index, label }))
  }, [items, text])

  useEffect(() => {
    if (trigger !== 'scroll' || !containerRef.current) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setEffectStarted(true)
        observer.disconnect()
      }
    }, { threshold: 0.15 })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [trigger])

  useEffect(() => {
    if (!effectStarted || !containerRef.current) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const { Engine, Runner, World, Bodies, Mouse, MouseConstraint, Body } = Matter
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    if (!rect.width || !rect.height) return undefined

    const engine = Engine.create()
    engine.world.gravity.y = gravity
    const boundaryOptions = { isStatic: true, render: { visible: false } }
    const walls = [
      Bodies.rectangle(rect.width / 2, rect.height + 24, rect.width, 48, boundaryOptions),
      Bodies.rectangle(-24, rect.height / 2, 48, rect.height, boundaryOptions),
      Bodies.rectangle(rect.width + 24, rect.height / 2, 48, rect.height, boundaryOptions),
      Bodies.rectangle(rect.width / 2, -24, rect.width, 48, boundaryOptions),
    ]

    const elements = [...container.querySelectorAll('.falling-text-word')]
    const wordBodies = elements.map((element, index) => {
      const wordRect = element.getBoundingClientRect()
      const body = Bodies.rectangle(
        wordRect.left - rect.left + wordRect.width / 2,
        wordRect.top - rect.top + wordRect.height / 2,
        wordRect.width,
        wordRect.height,
        { restitution: 0.72, frictionAir: 0.018, friction: 0.25 },
      )
      Body.setVelocity(body, { x: ((index % 3) - 1) * 0.9, y: 0 })
      Body.setAngularVelocity(body, ((index % 5) - 2) * 0.004)
      element.style.width = `${wordRect.width}px`
      element.style.height = `${wordRect.height}px`
      element.style.position = 'absolute'
      element.style.left = `${body.position.x}px`
      element.style.top = `${body.position.y}px`
      element.style.margin = '0'
      return { body, element }
    })

    const mouse = Mouse.create(container)
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: mouseConstraintStiffness, render: { visible: false } },
    })
    World.add(engine.world, [...walls, mouseConstraint, ...wordBodies.map(({ body }) => body)])

    const runner = Runner.create()
    Runner.run(runner, engine)
    let frameId
    const paint = () => {
      wordBodies.forEach(({ body, element }) => {
        element.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`
        element.style.left = `${body.position.x}px`
        element.style.top = `${body.position.y}px`
      })
      frameId = window.requestAnimationFrame(paint)
    }
    paint()

    return () => {
      window.cancelAnimationFrame(frameId)
      Runner.stop(runner)
      Mouse.clearSourceEvents(mouse)
      World.clear(engine.world, false)
      Engine.clear(engine)
    }
  }, [effectStarted, gravity, mouseConstraintStiffness, words])

  const startEffect = () => {
    if (!effectStarted && (trigger === 'click' || trigger === 'hover')) setEffectStarted(true)
  }

  return (
    <div
      ref={containerRef}
      className={`falling-text-container ${effectStarted ? 'is-falling' : ''} ${className}`}
      onClick={trigger === 'click' ? startEffect : undefined}
      onMouseEnter={trigger === 'hover' ? startEffect : undefined}
    >
      <div className="falling-text-target" style={{ fontSize }}>
        {words.map((item, index) => {
          const label = item.label ?? item.title ?? String(item)
          return (
            <button
              className={`falling-text-word${selectedIndex === index ? ' is-selected' : ''}`}
              type="button"
              key={item.id ?? label}
              style={{ '--word-color': item.color || '#b5a9da' }}
              onPointerDown={(event) => {
                event.stopPropagation()
                startEffect()
                onItemSelect?.(index)
              }}
              onMouseDown={(event) => {
                event.stopPropagation()
                startEffect()
                onItemSelect?.(index)
              }}
              onMouseEnter={() => onItemSelect?.(index)}
              onClick={(event) => {
                event.stopPropagation()
                startEffect()
                onItemSelect?.(index)
              }}
              aria-label={`选择项目：${label}`}
              aria-pressed={selectedIndex === index}
            >
              {label}
            </button>
          )
        })}
      </div>
      <span className="falling-text-hint" aria-hidden="true">
        {trigger === 'click' ? 'CLICK · DRAG · SELECT' : 'DRAG · SELECT'}
      </span>
    </div>
  )
}

export default FallingText
