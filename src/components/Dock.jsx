import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import './Dock.css'

function DockItem({
  item,
  mouseX,
  distance,
  magnification,
  baseItemSize,
  spring,
}) {
  const ref = useRef(null)
  const [isHovered, setIsHovered] = useState(false)

  const mouseDistance = useTransform(mouseX, (value) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return distance
    return value - rect.left - rect.width / 2
  })
  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize],
  )
  const size = useSpring(targetSize, spring)

  useEffect(() => {
    if (!isHovered) return undefined
    const onEscape = (event) => {
      if (event.key === 'Escape') ref.current?.blur()
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [isHovered])

  return (
    <motion.button
      ref={ref}
      className={`dock-item${item.active ? ' is-active' : ''}${item.className ? ` ${item.className}` : ''}`}
      style={{ width: size, height: size }}
      type="button"
      onClick={item.onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      aria-label={item.label}
      aria-current={item.active ? 'page' : undefined}
    >
      <span className="dock-icon" aria-hidden="true">{item.icon}</span>
      <AnimatePresence>
        {isHovered && (
          <motion.span
            className="dock-label"
            role="tooltip"
            style={{ x: '-50%' }}
            initial={{ opacity: 0, y: 4, scale: 0.94 }}
            animate={{ opacity: 1, y: -8, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.96 }}
            transition={{ duration: 0.16 }}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      <span className="dock-active-mark" aria-hidden="true" />
    </motion.button>
  )
}

export default function Dock({
  items = [],
  className = '',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 70,
  distance = 200,
  panelHeight = 68,
  baseItemSize = 50,
}) {
  const mouseX = useMotionValue(Infinity)

  return (
    <nav className="dock-outer" aria-label="页面导航">
      <motion.div
        className={`dock-panel ${className}`}
        style={{ height: panelHeight }}
        onMouseMove={({ pageX }) => mouseX.set(pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
      >
        {items.map((item) => (
          <DockItem
            key={item.label}
            item={item}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
          />
        ))}
      </motion.div>
    </nav>
  )
}
