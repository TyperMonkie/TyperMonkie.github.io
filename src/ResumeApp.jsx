import { useEffect, useRef, useState } from 'react'
import PortfolioBackdrop from './components/PortfolioBackdrop'
import SplitText from './components/SplitText'
import './resume.css'

const NAV_ITEMS = [
  { id: 'projects', label: '项目经历', index: '01' },
  { id: 'experience', label: '个人经历', index: '02' },
  { id: 'daily', label: '日常记录', index: '03' },
  { id: 'notes', label: '心得随笔', index: '04' },
]

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

const scrollToSection = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function ResumeApp() {
  const [activeSection, setActiveSection] = useState('projects')
  const projectCardRef = useRef(null)
  const siteRef = useRef(null)
  const heroRef = useRef(null)
  const contentShellRef = useRef(null)
  const resumeNavRef = useRef(null)

  useEffect(() => {
    document.documentElement.dataset.site = 'resume'
    document.documentElement.removeAttribute('data-theme')

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-revealed')
        })
      },
      { threshold: 0.12 },
    )

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveSection(visible.target.id)
      },
      { rootMargin: '-18% 0px -58% 0px', threshold: [0, 0.2, 0.5] },
    )

    document.querySelectorAll('[data-reveal]').forEach((element) => revealObserver.observe(element))
    NAV_ITEMS.forEach(({ id }) => {
      const section = document.getElementById(id)
      if (section) sectionObserver.observe(section)
    })

    let animationFrame
    const updateScrollPull = () => {
      animationFrame = undefined
      const viewportHeight = Math.max(window.innerHeight, 1)
      const rawProgress = Math.min(1, Math.max(0, window.scrollY / (viewportHeight * 0.78)))
      const easedProgress = 1 - ((1 - rawProgress) ** 3)
      const delayedProgress = Math.min(1, Math.max(0, (rawProgress - 0.055) / 0.945))
      const delayedEase = 1 - ((1 - delayedProgress) ** 3)

      heroRef.current?.style.setProperty('--hero-shift', `${window.scrollY * -0.17}px`)
      heroRef.current?.style.setProperty('--hero-fade', String(1 - rawProgress * 0.88))
      heroRef.current?.style.setProperty('--hero-blur', `${rawProgress * 7}px`)
      contentShellRef.current?.style.setProperty('--nav-entry-y', `${(1 - easedProgress) * 38}px`)
      contentShellRef.current?.style.setProperty('--nav-entry-scale', String(0.982 + easedProgress * 0.018))
      contentShellRef.current?.style.setProperty('--main-entry-y', `${(1 - delayedEase) * 62}px`)
      contentShellRef.current?.style.setProperty('--main-entry-scale', String(0.968 + delayedEase * 0.032))
      contentShellRef.current?.style.setProperty('--main-entry-tilt', `${(1 - delayedEase) * 1.4}deg`)

      const contentShell = contentShellRef.current
      const resumeNav = resumeNavRef.current
      if (contentShell && resumeNav) {
        const shellRect = contentShell.getBoundingClientRect()
        const shouldDock = window.innerWidth > 900 && shellRect.top <= 18

        if (shouldDock) {
          const firstColumn = window.getComputedStyle(contentShell).gridTemplateColumns.split(' ')[0]
          resumeNav.style.setProperty('--dock-left', `${shellRect.left}px`)
          resumeNav.style.setProperty('--dock-width', firstColumn)
          resumeNav.classList.add('is-docked')
        } else {
          resumeNav.classList.remove('is-docked')
          resumeNav.style.removeProperty('--dock-left')
          resumeNav.style.removeProperty('--dock-width')
        }
      }
    }

    const onScroll = () => {
      if (animationFrame) return
      animationFrame = window.requestAnimationFrame(updateScrollPull)
    }
    updateScrollPull()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      revealObserver.disconnect()
      sectionObserver.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      resumeNavRef.current?.classList.remove('is-docked')
      delete document.documentElement.dataset.site
    }
  }, [])

  const updateCardLight = (event) => {
    const card = projectCardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    card.style.setProperty('--pointer-x', `${x}px`)
    card.style.setProperty('--pointer-y', `${y}px`)
    card.style.setProperty('--tilt-x', `${((y / rect.height) - 0.5) * -2.2}deg`)
    card.style.setProperty('--tilt-y', `${((x / rect.width) - 0.5) * 2.2}deg`)
  }

  const resetCard = () => {
    const card = projectCardRef.current
    if (!card) return
    card.style.setProperty('--tilt-x', '0deg')
    card.style.setProperty('--tilt-y', '0deg')
  }

  const openProject = () => {
    window.location.hash = '/project'
  }

  return (
    <main className="resume-site" ref={siteRef}>
      <PortfolioBackdrop />

      <section className="resume-hero" id="home" aria-labelledby="resume-title" ref={heroRef}>
        <div className="hero-monogram" aria-hidden="true">Y</div>
        <div className="resume-hero-copy">
          <span className="hero-kicker">YIZE · PERSONAL ARCHIVE</span>
          <SplitText
            text="Hello，welcome to Yize’s website！"
            className="resume-title"
            delay={46}
            duration={0.8}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
            to={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            threshold={0.1}
            rootMargin="-100px"
            textAlign="center"
            tag="h1"
          />
          <p className="resume-subtitle">这里记录着我的个人经历，日常和心得，欢迎大家访问！</p>
        </div>

        <button className="hero-scroll" type="button" onClick={() => scrollToSection('projects')}>
          <span>SCROLL TO EXPLORE</span>
          <i aria-hidden="true" />
        </button>
      </section>

      <div className="resume-content-shell" ref={contentShellRef}>
        <aside ref={resumeNavRef} className="resume-nav glass-panel" aria-label="简历内容导航">
          <button className="resume-signature" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="signature-mark">Y</span>
            <span><strong>YIZE</strong><small>PERSONAL WEBSITE</small></span>
          </button>

          <nav>
            {NAV_ITEMS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={activeSection === item.id ? 'is-active' : ''}
                onClick={() => scrollToSection(item.id)}
              >
                <span>{item.index}</span>
                <strong>{item.label}</strong>
                <i aria-hidden="true" />
              </button>
            ))}
          </nav>

          <p className="nav-footer"><span /> AVAILABLE FOR<br />NEW IDEAS</p>
        </aside>

        <div className="resume-main glass-panel">
          <section className="resume-section project-section" id="projects">
            <header className="section-heading" data-reveal>
              <p><span>01</span> SELECTED WORK</p>
              <h2>项目经历</h2>
              <div className="section-rule" />
            </header>

            <article
              className="project-feature"
              ref={projectCardRef}
              onPointerMove={updateCardLight}
              onPointerLeave={resetCard}
              data-reveal
            >
              <div className="project-card-glow" aria-hidden="true" />
              <div className="project-meta">
                <span>FEATURED PROJECT</span>
                <span>2026</span>
              </div>
              <div className="project-copy">
                <p className="project-index">PROJECT / 001</p>
                <h3><span>基于 ESP32-S3 的</span><span>多模态智能体搭建</span></h3>
                <p className="project-description">
                  从感知、推理到动作执行，让小车拥有视觉、语音、表情与自主工具调用能力的完整智能体实践。
                </p>
              </div>
              <div className="project-tech" aria-label="项目技术标签">
                <span>ESP32-S3</span><span>MULTIMODAL</span><span>AI AGENT</span>
              </div>
              <button className="project-link" type="button" onClick={openProject}>
                <span>进入项目</span><ArrowIcon />
              </button>
            </article>
          </section>

          <section className="resume-section placeholder-section" id="experience">
            <header className="section-heading" data-reveal>
              <p><span>02</span> EXPERIENCE</p>
              <h2>个人经历</h2>
              <div className="section-rule" />
            </header>
            <div className="placeholder-copy" data-reveal><span>COMING SOON</span><p>更多经历，正在整理。</p></div>
          </section>

          <section className="resume-section placeholder-section" id="daily">
            <header className="section-heading" data-reveal>
              <p><span>03</span> DAILY</p>
              <h2>日常记录</h2>
              <div className="section-rule" />
            </header>
            <div className="placeholder-copy daily-entry" data-reveal>
              <div><span>MARKDOWN NOTES</span><p>生活切片、技术记录与随笔，都收进独立的笔记空间。</p></div>
              <button type="button" className="notes-entry-button" onClick={() => { window.location.hash = '/notes' }}>
                <span>进入笔记</span><ArrowIcon />
              </button>
            </div>
          </section>

          <section className="resume-section placeholder-section" id="notes">
            <header className="section-heading" data-reveal>
              <p><span>04</span> NOTES</p>
              <h2>心得随笔</h2>
              <div className="section-rule" />
            </header>
            <div className="placeholder-copy" data-reveal><span>COMING SOON</span><p>思考与发现，留待书写。</p></div>
          </section>

          <footer className="resume-footer">
            <span>YIZE © 2026</span><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>BACK TO TOP ↑</button>
          </footer>
        </div>
      </div>
    </main>
  )
}

export default ResumeApp
