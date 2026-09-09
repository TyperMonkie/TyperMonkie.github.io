import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'

const TextType = ({
  text,
  as: Component = 'div',
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
  deletingSpeed = 30,
  loop = true,
  className = '',
  showCursor = true,
  hideCursorWhileTyping = false,
  cursorCharacter = '|',
  cursorClassName = '',
  cursorBlinkDuration = 0.5,
  textColors = [],
  variableSpeed,
  onSentenceComplete,
  startOnVisible = false,
  reverseMode = false,
  ...props
}) => {
  const [displayedText, setDisplayedText] = useState('')
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(!startOnVisible)
  const cursorRef = useRef(null)
  const containerRef = useRef(null)
  const textArray = useMemo(() => (Array.isArray(text) ? text : [text]), [text])
  const getRandomSpeed = useCallback(() => {
    if (!variableSpeed) return typingSpeed
    return Math.random() * (variableSpeed.max - variableSpeed.min) + variableSpeed.min
  }, [variableSpeed, typingSpeed])

  useEffect(() => {
    if (!startOnVisible || !containerRef.current) return undefined
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) setIsVisible(true)
    }, { threshold: 0.1 })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [startOnVisible])

  useEffect(() => {
    if (!showCursor || !cursorRef.current) return undefined
    const tween = gsap.to(cursorRef.current, {
      opacity: 0,
      duration: cursorBlinkDuration,
      repeat: -1,
      yoyo: true,
      ease: 'power2.inOut',
    })
    return () => tween.kill()
  }, [showCursor, cursorBlinkDuration])

  useEffect(() => {
    if (!isVisible) return undefined
    const source = String(textArray[currentTextIndex] ?? '')
    const currentText = reverseMode ? [...source].reverse().join('') : source
    let delay = typingSpeed
    let action

    if (isDeleting) {
      delay = displayedText ? deletingSpeed : 260
      action = displayedText
        ? () => setDisplayedText(value => value.slice(0, -1))
        : () => {
            onSentenceComplete?.(source, currentTextIndex)
            setIsDeleting(false)
            setCurrentTextIndex(index => (index + 1) % textArray.length)
            setCurrentCharIndex(0)
          }
    } else if (currentCharIndex < currentText.length) {
      delay = currentCharIndex === 0 ? initialDelay : getRandomSpeed()
      action = () => {
        setDisplayedText(value => value + currentText[currentCharIndex])
        setCurrentCharIndex(index => index + 1)
      }
    } else if (loop || currentTextIndex < textArray.length - 1) {
      delay = pauseDuration
      action = () => setIsDeleting(true)
    }

    if (!action) return undefined
    const timer = window.setTimeout(action, delay)
    return () => window.clearTimeout(timer)
  }, [currentCharIndex, currentTextIndex, deletingSpeed, displayedText, getRandomSpeed, initialDelay, isDeleting, isVisible, loop, onSentenceComplete, pauseDuration, reverseMode, textArray, typingSpeed])

  const shouldHideCursor = hideCursorWhileTyping && (currentCharIndex < String(textArray[currentTextIndex]).length || isDeleting)
  const color = textColors.length ? textColors[currentTextIndex % textColors.length] : 'inherit'

  return createElement(Component, { ref: containerRef, className: `text-type ${className}`, ...props },
    <span className="text-type__content" style={{ color }}>{displayedText}</span>,
    showCursor && <span ref={cursorRef} className={`text-type__cursor ${cursorClassName} ${shouldHideCursor ? 'text-type__cursor--hidden' : ''}`}>{cursorCharacter}</span>,
  )
}

export default TextType
