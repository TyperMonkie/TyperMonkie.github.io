import { useEffect, useState } from 'react'
import ParticleCar from './components/ParticleCar'
import PixelSwap from './components/PixelSwap'
import TextType from './components/TextType'

const SunIcon = () => (
  <span className="theme-icon sun-icon" aria-hidden="true"><span className="sun-core" /></span>
)

const MoonIcon = () => (
  <span className="theme-icon moon-icon" aria-hidden="true"><span className="moon-core" /></span>
)

function App() {
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = isLight ? 'light' : 'dark'
  }, [isLight])

  return (
    <main className="home-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="AI CAR 首页">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>AI CAR</span>
        </a>

        <button
          className="theme-toggle"
          type="button"
          onClick={() => setIsLight(current => !current)}
          aria-label={isLight ? '切换至夜间模式' : '切换至日间模式'}
          aria-pressed={isLight}
        >
          <PixelSwap
            firstContent={<MoonIcon />}
            secondContent={<SunIcon />}
            active={isLight}
            trigger="manual"
            pixelSize={10}
            pixelRadius={18}
            pixelScale={0.22}
            duration={680}
            pixelDuration={260}
            pattern="diagonal"
            randomness={0.18}
            aspectRatio="1"
          />
        </button>
      </header>

      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="ambient ambient-one" aria-hidden="true" />
        <div className="ambient ambient-two" aria-hidden="true" />
        <ParticleCar isLight={isLight} />

        <div className="hero-copy">
          <p className="eyebrow"><span /> AUTONOMOUS INTELLIGENCE</p>
          <h1 id="hero-title">
            <span className="sr-only">让智能，自由移动。</span>
            <TextType
              text={['让智能，自由移动。', '感知 · 思考 · 行动', '为真实世界而生。']}
              typingSpeed={92}
              deletingSpeed={42}
              pauseDuration={2100}
              initialDelay={700}
              variableSpeed={{ min: 68, max: 118 }}
              cursorCharacter="_"
              aria-hidden="true"
            />
          </h1>
          <p className="hero-note">AI ROBOTICS · DESIGNED BY TYPER MONKIE</p>
        </div>

        <div className="status-line" aria-hidden="true">
          <span>VISION / MOTION / CONTROL</span><span className="status-pulse" /><span>SYSTEM ONLINE</span>
        </div>

        <div className="scroll-cue" aria-hidden="true"><span>EXPLORE</span><i /></div>
      </section>
    </main>
  )
}

export default App
