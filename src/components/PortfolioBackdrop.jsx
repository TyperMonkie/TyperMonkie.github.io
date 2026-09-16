import Lightfall from './Lightfall'

const LIGHTFALL_COLORS = ['#A6C8FF', '#5227FF', '#FF9FFC']

function PortfolioBackdrop() {
  return (
    <>
      <div className="resume-lightfall" aria-hidden="true">
        <Lightfall
          colors={LIGHTFALL_COLORS}
          backgroundColor="#0A29FF"
          speed={1}
          streakCount={8}
          streakWidth={1}
          streakLength={1}
          glow={1}
          density={1}
          twinkle={1}
          zoom={2}
          backgroundGlow={1}
          opacity={1}
          mouseInteraction
          mouseStrength={1}
          mouseRadius={0.6}
          dpr={Math.min(window.devicePixelRatio || 1, 1.75)}
        />
      </div>
      <div className="resume-vignette" aria-hidden="true" />
      <div className="resume-grain" aria-hidden="true" />
    </>
  )
}

export default PortfolioBackdrop
