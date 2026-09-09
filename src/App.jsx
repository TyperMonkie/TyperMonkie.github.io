import { useEffect, useState } from 'react'
import ParticleCar from './components/ParticleCar'
import Particles from './components/Particles'
import PixelSwap from './components/PixelSwap'
import TextType from './components/TextType'

const PURPLE_PARTICLE_COLORS = ['#9b6cff', '#7c3aed', '#c4a7ff']

const SunIcon = () => (
  <span className="theme-icon sun-icon" aria-hidden="true"><span className="sun-core" /></span>
)

const MoonIcon = () => (
  <span className="theme-icon moon-icon" aria-hidden="true"><span className="moon-core" /></span>
)

function App() {
  const [isLight, setIsLight] = useState(false)
  const [particleCycle, setParticleCycle] = useState(0)

  useEffect(() => {
    document.documentElement.dataset.theme = isLight ? 'light' : 'dark'
  }, [isLight])

  const toggleTheme = () => {
    setIsLight(current => !current)
    setParticleCycle(cycle => cycle + 1)
  }

  return (
    <main className="home-shell">
      <div className="background-particles" aria-hidden="true">
        <Particles
          particleColors={PURPLE_PARTICLE_COLORS}
          particleCount={720}
          particleSpread={11}
          speed={0.085}
          particleBaseSize={96}
          sizeRandomness={0.85}
          moveParticlesOnHover={false}
          alphaParticles={false}
          cameraDistance={20}
          disableRotation={false}
          pixelRatio={1.5}
        />
      </div>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="AI CAR 首页">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>AI CAR</span>
        </a>

        <button
          className="theme-toggle"
          type="button"
          onClick={toggleTheme}
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
        <ParticleCar rebuildKey={particleCycle} />

        <div className="hero-copy">
          <p className="eyebrow"><span /> AUTONOMOUS INTELLIGENCE</p>
          <h1 id="hero-title">
            <span className="sr-only">Make ideas real</span>
            <TextType
              text="Make ideas real"
              typingSpeed={75}
              pauseDuration={1500}
              showCursor={true}
              cursorCharacter="|"
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
