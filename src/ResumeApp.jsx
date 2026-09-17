import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import FallingText from './components/FallingText'
import InfiniteMenu from './components/InfiniteMenu'
import PortfolioBackdrop from './components/PortfolioBackdrop'
import SplitText from './components/SplitText'
import './resume.css'

const Lanyard = lazy(() => import('./components/Lanyard'))

const PROJECT_ATLAS = '/portfolio/project-atlas.png'
const PROJECT_LANYARD_IMAGE = '/portfolio/lanyard-portrait.png'

// 项目区的标题、说明、颜色与详情都集中在这里，后续修改内容只需要编辑这个数组。
const PROJECTS = [
  {
    id: 'car-agent',
    title: 'Multimodal AI Car Agent',
    label: 'AI Car',
    color: '#b8a6d9',
    image: PROJECT_ATLAS,
    crop: { x: 0, y: 0, w: .25, h: .5 },
    description: '基于ESP32S3的多模态智能小车智能体搭建（拥有视觉，听觉和语音合成的模态）',
    detail: '我们为小车搭建了功能展示网站',
    tags: ['ESP32-S3', 'MULTIMODAL', 'AI AGENT'],
    link: '#/project',
    linkLabel: '查看功能展示网站',
  },
  {
    id: 'mentor-agent',
    title: 'Mentor Searching Agent',
    label: 'Agent',
    color: '#86a9b4',
    image: PROJECT_ATLAS,
    crop: { x: .25, y: 0, w: .25, h: .5 },
    description: '面向研究方向、导师信息与匹配度的智能检索与推荐智能体。',
    detail: '整合公开信息检索、兴趣抽取与候选结果排序，让导师调研过程更清晰。',
    tags: ['SEARCH', 'RAG', 'AGENT'],
  },
  {
    id: 'ego-gesture',
    title: 'Ego Gesture Recognition',
    label: 'Gesture',
    color: '#c0a1b2',
    image: PROJECT_ATLAS,
    crop: { x: .5, y: 0, w: .25, h: .5 },
    description: '以第一人称视觉理解手势，并将识别结果映射为可执行交互指令。',
    detail: '项目详情暂以视觉采集、时序特征和手势分类三个模块组织，后续可继续补充实验结果。',
    tags: ['VISION', 'GESTURE', 'CV'],
  },
  {
    id: '3d-printing',
    title: '3D Printing',
    label: '3D',
    color: '#b6a47f',
    image: PROJECT_ATLAS,
    crop: { x: .75, y: 0, w: .25, h: .5 },
    description: '从三维建模、切片参数到成品迭代的数字制造实践。',
    detail: '这里可以继续补充打印材料、设备参数、失败案例和最终成品展示。',
    tags: ['CAD', 'FABRICATION', 'PROTOTYPE'],
  },
  {
    id: 'running-form',
    title: 'AI Running Form Correction Website',
    label: 'Runform-Web',
    color: '#829fbe',
    image: PROJECT_ATLAS,
    crop: { x: 0, y: .5, w: .25, h: .5 },
    description: '通过姿态估计分析跑姿，并在网页端给出直观的动作纠正建议。',
    detail: '后续可在这里加入动作评分、关键帧对比与个性化训练建议。',
    tags: ['POSE', 'WEB', 'COACHING'],
  },
  {
    id: 'dl-builder',
    title: 'Deep-Learning Structure Building Platform',
    label: 'DL-Builder',
    color: '#9a8fbd',
    image: PROJECT_ATLAS,
    crop: { x: .25, y: .5, w: .25, h: .5 },
    description: '面向深度学习结构的可视化搭建平台，用模块组合降低实验门槛。',
    detail: '这里可以补充节点编辑、结构校验、代码导出和实验管理等平台能力。',
    tags: ['DEEP LEARNING', 'LOW CODE', 'PLATFORM'],
  },
  {
    id: 'emotion',
    title: 'Multimodal Emotion Recognition',
    label: 'AffectGPT',
    color: '#b4939f',
    image: PROJECT_ATLAS,
    crop: { x: .5, y: .5, w: .25, h: .5 },
    description: '融合视觉、语音与文本信号，识别更贴近真实交流场景的情绪状态。',
    detail: '后续可补充数据集、融合策略、评估指标与实际交互效果。',
    tags: ['EMOTION', 'FUSION', 'MULTIMODAL'],
  },
]

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
  const [selectedProject, setSelectedProject] = useState(0)
  const [expandedProject, setExpandedProject] = useState(null)
  const [projectLanyardVisible, setProjectLanyardVisible] = useState(false)
  const projectSelectionLockRef = useRef(0)
  const siteRef = useRef(null)
  const heroRef = useRef(null)
  const contentShellRef = useRef(null)
  const resumeNavRef = useRef(null)
  const projectLanyardRef = useRef(null)

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

    const lanyardObserver = new IntersectionObserver(
      ([entry]) => setProjectLanyardVisible(entry.isIntersecting),
      { rootMargin: '120px 0px', threshold: 0.01 },
    )
    if (projectLanyardRef.current) lanyardObserver.observe(projectLanyardRef.current)

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
      lanyardObserver.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      resumeNavRef.current?.classList.remove('is-docked')
      delete document.documentElement.dataset.site
    }
  }, [])

  const chooseProject = (index, lock = false) => {
    if (lock) projectSelectionLockRef.current = Date.now() + 1400
    setSelectedProject(index)
  }

  const detailProjectIndex = expandedProject ?? selectedProject
  const detailProject = PROJECTS[detailProjectIndex]

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

            <div className="project-lab" data-reveal>
              <div className="project-lab-meta">
                <span>INTERACTIVE PROJECT INDEX</span>
                <span>07 PROJECTS · 2026</span>
              </div>

              <div className="project-lab-top">
                <div className="project-lanyard" ref={projectLanyardRef}>
                  {projectLanyardVisible && (
                    <Suspense fallback={<div className="lanyard-loading" aria-hidden="true" />}>
                      <Lanyard
                        key="project-lanyard-raised"
                        position={[0, 0, 24]}
                        gravity={[0, -40, 0]}
                        cardScale={4.5}
                        verticalOffset={1.8}
                        frontImage={PROJECT_LANYARD_IMAGE}
                        backImage={PROJECT_LANYARD_IMAGE}
                        imageFit="cover"
                        lanyardWidth={1}
                        ariaLabel="可拖动的项目身份牌"
                      />
                    </Suspense>
                  )}
                  <span className="project-lanyard-label">DRAG THE ID CARD</span>
                </div>

                <FallingText
                  className="project-falling-text"
                  items={PROJECTS}
                  selectedIndex={selectedProject}
                  onItemSelect={(index) => chooseProject(index, true)}
                  trigger="scroll"
                  gravity={.56}
                  fontSize="clamp(1.75rem, 3vw, 2.6rem)"
                  mouseConstraintStiffness={.9}
                />
              </div>

              <div className={`project-explorer${expandedProject !== null ? ' is-expanded' : ''}`}>
                <div className="project-orbit-panel">
                  <InfiniteMenu
                    items={PROJECTS}
                    activeIndex={selectedProject}
                    onActiveItemChange={(index) => {
                      if (Date.now() >= projectSelectionLockRef.current) chooseProject(index)
                    }}
                    onAction={(index) => {
                      setSelectedProject(index)
                      setExpandedProject(index)
                    }}
                    scale={1.08}
                    backgroundColor="rgba(7, 6, 14, .72)"
                  />
                </div>

                <aside className="project-detail" aria-hidden={expandedProject === null}>
                  <button
                    className="project-detail-close"
                    type="button"
                    onClick={() => setExpandedProject(null)}
                    aria-label="关闭项目详情"
                    tabIndex={expandedProject === null ? -1 : 0}
                  >
                    ×
                  </button>
                  <span className="project-detail-index">PROJECT / {String(detailProjectIndex + 1).padStart(3, '0')}</span>
                  <h3>{detailProject.title}</h3>
                  <p className="project-detail-description">{detailProject.description}</p>
                  <div className="project-detail-rule" />
                  <p className="project-detail-body">{detailProject.detail}</p>
                  <div className="project-detail-tags">
                    {detailProject.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  {detailProject.link ? (
                    <button
                      className="project-detail-link"
                      type="button"
                      tabIndex={expandedProject === null ? -1 : 0}
                      onClick={() => { window.location.hash = detailProject.link.replace('#', '') }}
                    >
                      <span>{detailProject.linkLabel}</span><ArrowIcon />
                    </button>
                  ) : (
                    <span className="project-detail-pending">MORE CONTENT COMING SOON</span>
                  )}
                </aside>
              </div>
            </div>
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
