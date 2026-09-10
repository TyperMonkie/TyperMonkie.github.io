import { lazy, Suspense, useEffect, useState } from 'react'
import BorderGlow from './components/BorderGlow'
import Dock from './components/Dock'
import ParticleCar from './components/ParticleCar'
import Particles from './components/Particles'
import PixelSwap from './components/PixelSwap'
import ScrollExpand from './components/ScrollExpand'
import TextType from './components/TextType'

const PURPLE_PARTICLE_COLORS = ['#9b6cff', '#7c3aed', '#c4a7ff']
const XIONGER_EXPRESSION_FRAMES = Array.from(
  { length: 26 },
  (_, index) => `/expressions/frame-${String(index + 1).padStart(2, '0')}.png`,
)
const Lanyard = lazy(() => import('./components/Lanyard'))
const WORKERS = [
  {
    name: 'bear_motion：运动工人',
    description: '调用小车的轮胎运动。',
    left: '17%',
    top: '17%',
  },
  {
    name: 'bear_tcp：TCP 通信工人',
    description: '接受电脑发出的信息，解析之后决定调用对应的函数。',
    left: '50%',
    top: '17%',
  },
  {
    name: 'bear_discovery：UDP 发现工人',
    description: '小车发现热点工人。',
    left: '83%',
    top: '17%',
  },
  {
    name: 'mic_tx：麦克风发送工人',
    description: '接受麦克风信息并发送出去的工人。',
    left: '17%',
    top: '50%',
  },
  {
    name: 'us_sample：超声波采样工人',
    description: '自己去进行持续的超声探测，实现 10cm 危险急停。',
    left: '50%',
    top: '50%',
  },
  {
    name: 'face_anim：表情动画工人',
    description: '负责把预设表情写入显示屏的工人。',
    left: '83%',
    top: '50%',
  },
  {
    name: 'camera_tx：摄像头转发工人',
    description: '把摄像头内容转发给电脑的工人。',
    left: '50%',
    top: '83%',
  },
]

const AGENT_LOOP = [
  '一轮用户请求',
  '用户输入',
  '加入历史',
  '经过 agent.py 的信息改造，变成 LLM 可读接口之后发送给 LLM',
  'LLM 思考，生成 JSON 文件',
  '发送给小车',
  '解析，如果要调用工具，则调用',
  '把工具调用结果发送回电脑给 LLM',
  'LLM 决定下一步',
  '直到 tool_call = null',
]

const TOOL_GROUPS = [
  {
    title: 'embodyment_tools：驾驶工具',
    left: '25%',
    top: '18%',
    tools: [
      ['01', 'move_forward', '前进'],
      ['02', 'move_backward', '后退'],
      ['03', 'turn_left', '左转'],
      ['04', 'turn_right', '右转'],
      ['05', 'spin_left', '左旋'],
      ['06', 'spin_right', '右旋'],
      ['07', 'translate_left', '左平移'],
      ['08', 'translate_right', '右平移'],
    ],
  },
  {
    title: 'body_tools：身体工具',
    left: '75%',
    top: '18%',
    tools: [
      ['09', 'nod', '点头'],
      ['10', 'sway', '摇摆'],
      ['11', 'happy_dance', '快乐时候的舞'],
      ['12', 'shy_wiggle', '害羞时候的摆动'],
      ['13', 'sad_sway', '伤心时候的摆动'],
      ['14', 'look_up', '舵机上抬'],
      ['15', 'level_down', '舵机下落'],
      ['16', 'crazy_dance', '疯狂时候的舞蹈'],
    ],
  },
  {
    title: '表情工具',
    left: '25%',
    top: '50%',
    tools: [
      ['17', 'happy', '开心的表情'],
      ['18', 'sad', '伤心的表情'],
      ['19', 'thinking', '思考中的表情'],
      ['20', 'listening', '聆听中的表情'],
    ],
  },
  {
    title: '附加工具',
    left: '75%',
    top: '50%',
    tools: [
      ['21', 'weather', '天气查询'],
      ['22', 'clock', '获取电脑时间'],
      ['23', 'record', '备忘录'],
      ['24', 'set_alarm', '设置闹钟'],
      ['25', 'cancel_alarm', '取消闹钟'],
      ['26', 'list_schedule', '查看未触发事项'],
    ],
  },
  {
    title: '摄像工具',
    left: '25%',
    top: '82%',
    tools: [
      ['27', 'take_photo', '拍照'],
      ['28', 'record_video', '录制视频'],
      ['29', 'edit_image', '调用图像生成模型编辑和生成图片'],
      ['30', 'list_media', '展示媒体网页'],
      ['31', 'publish_media', '发布媒体网页'],
      ['32', 'delete_media', '删除媒体网页缓存'],
      ['33', 'analyze_image', '调用视觉模型理解图片或视频'],
    ],
  },
  {
    title: 'speak：说话工具',
    left: '75%',
    top: '82%',
    tools: [['34', 'speak', '让小车通过语音表达内容']],
  },
]

const MODEL_STACK = [
  ['Sherpa-ONNX', '听见固定唤醒词'],
  ['GLM-ASR-2512', '声音转文字'],
  ['AWS-GPT-5.6-Sol', '主要负责理解、规划、选工具'],
  ['GLM-5-Turbo', '主 LLM 失败时备用'],
  ['GLM-4.6V', '看照片并回答图片问题'],
  ['Doubao-Seedream-4.5', '编辑或生成图片'],
  ['speech-2.8-turbo', '文字转语音，让小车说话'],
]

const SunIcon = () => (
  <span className="theme-icon sun-icon" aria-hidden="true"><span className="sun-core" /></span>
)

const MoonIcon = () => (
  <span className="theme-icon moon-icon" aria-hidden="true"><span className="moon-core" /></span>
)

const DockGlyph = ({ type }) => {
  const commonProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.65,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  if (type === 'home') {
    return (
      <svg {...commonProps}>
        <path d="M3.5 10.6 12 3.7l8.5 6.9" />
        <path d="M5.7 9.2v10.4h12.6V9.2M9.4 19.6v-5.7h5.2v5.7" />
      </svg>
    )
  }

  if (type === 'xionger') {
    return (
      <svg {...commonProps}>
        <path d="M8.1 5.4 6.5 3.8 4.7 5.6l1.5 1.5M15.9 5.4l1.6-1.6 1.8 1.8-1.5 1.5" />
        <rect x="5.2" y="5.5" width="13.6" height="15" rx="3.1" />
        <circle cx="9.4" cy="11" r=".75" fill="currentColor" stroke="none" />
        <circle cx="14.6" cy="11" r=".75" fill="currentColor" stroke="none" />
        <path d="M9.2 15.1c1.6 1.2 4 1.2 5.6 0" />
      </svg>
    )
  }

  if (type === 'car') {
    return (
      <svg {...commonProps}>
        <path d="m5 15.5 1.6-5.1c.3-1 1.2-1.7 2.3-1.7h6.2c1.1 0 2 .7 2.3 1.7l1.6 5.1" />
        <path d="M3.8 14.1h16.4v4.2H3.8zM7 18.3v1.4M17 18.3v1.4" />
        <path d="M8.2 5.1h7.6M12 5.1V3" />
        <circle cx="7.2" cy="16.1" r=".7" fill="currentColor" stroke="none" />
        <circle cx="16.8" cy="16.1" r=".7" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  if (type === 'computer') {
    return (
      <svg {...commonProps}>
        <rect x="3.4" y="4.4" width="17.2" height="12.1" rx="1.7" />
        <path d="m7.1 8.2 2.5 2-2.5 2M11.7 12.2h4M8.4 20h7.2M12 16.5V20" />
      </svg>
    )
  }

  if (type === 'models') {
    return (
      <svg {...commonProps}>
        <path d="m12 3 1.5 3.8L17 8.4l-3.5 1.5L12 14l-1.5-4.1L7 8.4l3.5-1.6L12 3Z" />
        <path d="m18.5 13.2.8 2.1 2.1.8-2.1.8-.8 2.2-.8-2.2-2.1-.8 2.1-.8.8-2.1ZM5.5 13.7l.8 1.9 1.8.7-1.8.8-.8 1.8-.7-1.8-1.9-.8 1.9-.7.7-1.9Z" />
      </svg>
    )
  }

  return (
    <svg {...commonProps}>
      <rect x="3.6" y="5.2" width="16.8" height="13.6" rx="2.2" />
      <path d="m10 9.1 5.3 2.9-5.3 2.9V9.1ZM8 3.2h8" />
      <path d="M18.5 5.2 20 3.7" />
    </svg>
  )
}

const PAGE_NAV_ITEMS = [
  ['首页', 'home'],
  ['熊二', 'xionger'],
  ['小车端', 'car'],
  ['电脑端', 'computer'],
  ['模型影像', 'models'],
  ['问题演示', 'demo'],
]

function App() {
  const [isLight, setIsLight] = useState(false)
  const [particleCycle, setParticleCycle] = useState(0)
  const [activePage, setActivePage] = useState(0)
  const [introCycle, setIntroCycle] = useState(0)
  const [workersExpanded, setWorkersExpanded] = useState(false)
  const [toolsExpanded, setToolsExpanded] = useState(false)
  const [finalPageCycle, setFinalPageCycle] = useState(0)

  useEffect(() => {
    document.documentElement.dataset.theme = isLight ? 'light' : 'dark'
  }, [isLight])

  const toggleTheme = () => {
    setIsLight(current => !current)
    setParticleCycle(cycle => cycle + 1)
  }

  const showPage = (page) => {
    if (page === activePage) return
    if (page === 1) setIntroCycle((cycle) => cycle + 1)
    if (page === 2) setWorkersExpanded(false)
    if (page === 3) setToolsExpanded(false)
    if (page === 4) setFinalPageCycle((cycle) => cycle + 1)
    setActivePage(page)
  }

  const getPageState = (page) => {
    if (page === activePage) return 'is-active'
    return `is-inactive ${page < activePage ? 'is-before' : 'is-after'}`
  }

  const dockItems = PAGE_NAV_ITEMS.map(([label, type], page) => ({
    label,
    icon: <DockGlyph type={type} />,
    active: activePage === page,
    onClick: () => showPage(page),
  }))

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
        <a
          className="brand"
          href="#top"
          aria-label="AI CAR 首页"
          onClick={(event) => {
            event.preventDefault()
            showPage(0)
          }}
        >
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

      <section
        className={`hero page-panel ${getPageState(0)}`}
        id="top"
        aria-labelledby="hero-title"
        aria-hidden={activePage !== 0}
      >
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

        <button
          className="scroll-cue page-switch"
          type="button"
          onClick={() => showPage(1)}
          aria-label="进入熊二介绍页"
        >
          <span>EXPLORE</span><i />
        </button>
      </section>

      <section
        className={`character-intro page-panel ${getPageState(1)} ${activePage === 1 ? 'is-visible' : ''}`}
        id="xionger"
        aria-labelledby="character-title"
        aria-hidden={activePage !== 1}
      >
        <div className="character-orbit character-orbit-large" aria-hidden="true" />
        <div className="character-orbit character-orbit-small" aria-hidden="true" />

        <div className="lanyard-stage">
          {activePage === 1 && (
            <Suspense fallback={<div className="lanyard-loading" aria-hidden="true" />}>
              <Lanyard
                key={introCycle}
                position={[0, 0, 24]}
                gravity={[0, -40, 0]}
                frontImages={XIONGER_EXPRESSION_FRAMES}
                frameDuration={500}
                backImage={XIONGER_EXPRESSION_FRAMES[0]}
                imageFit="cover"
                lanyardWidth={1}
              />
            </Suspense>
          )}
          <span className="drag-hint" aria-hidden="true">DRAG TO MOVE</span>
        </div>

        <div className="character-copy">
          <h2 className="reveal-copy" id="character-title">熊二驾到</h2>
          <p className="character-lead reveal-copy">
            <span>掌控全车的狗熊岭之王，不容反驳的傲娇“狗熊”</span>
            <span>性格设计为傲娇的狗熊岭之王，能够控制整个小车的任何工具。</span>
          </p>
          <p className="character-body reveal-copy">
            <span>“熊二”是由我们自己设计的 AI 小车形象，有着一系列的表情，会跟随小车的心情改变。</span>
            <span>拥有超 30 张表现不同情感和动作的动画，让小车的情感表达更为连贯、细腻。</span>
          </p>
        </div>

        <button
          className="scroll-cue page-switch page-back"
          type="button"
          onClick={() => showPage(0)}
          aria-label="返回首页"
        >
          <span>BACK</span><i />
        </button>

        <button
          className="scroll-cue page-switch page-next"
          type="button"
          onClick={() => showPage(2)}
          aria-label="进入小车端介绍页"
        >
          <span>NEXT</span><i />
        </button>
      </section>

      <section
        className={`car-side page-panel ${getPageState(2)}`}
        id="car-side"
        aria-labelledby="car-side-title"
        aria-hidden={activePage !== 2}
      >
        <div className="car-side-halo" aria-hidden="true" />

        <div className="car-side-copy">
          <h2 id="car-side-title">小车端</h2>
          <div className="car-side-lines">
            <p>小车和电脑的通信是通过连接同一个手机热点实现的。</p>
            <p>以实现电脑可以连接网络用 API 与外界大模型通讯的同时可以给小车命令。</p>
            <p>这个功能的发现也是我们做这个智能体项目的根本来源。</p>
            <p>小车和电脑的通讯协议为 TCP。</p>
          </div>
        </div>

        <div className={`worker-stage${workersExpanded ? ' is-expanded' : ''}`}>
          <div
            className="worker-trigger"
            role="button"
            tabIndex={workersExpanded ? -1 : 0}
            aria-expanded={workersExpanded}
            aria-controls="worker-constellation"
            onClick={() => setWorkersExpanded(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setWorkersExpanded(true)
              }
            }}
          >
            <BorderGlow
              edgeSensitivity={30}
              glowColor="40 80 80"
              backgroundColor="#120F17"
              borderRadius={28}
              glowRadius={40}
              glowIntensity={1}
              coneSpread={25}
              animated={false}
              colors={['#c084fc', '#f472b6', '#38bdf8']}
              className="worker-hub"
            >
              <div className="worker-hub-content">
                <span className="worker-hub-kicker">THREAD NETWORK</span>
                <h3>小车端我们注册了多个分工明确的线程</h3>
                <p>各个“工人”之间相互协作，完成小车端的控制</p>
                <span className="worker-hub-action">点击展开 · 7 WORKERS</span>
              </div>
            </BorderGlow>
          </div>

          <div
            className="worker-constellation"
            id="worker-constellation"
            aria-hidden={!workersExpanded}
          >
            {WORKERS.map((worker, index) => (
              <article
                className="worker-card"
                key={worker.name}
                style={{
                  '--worker-left': worker.left,
                  '--worker-top': worker.top,
                  '--worker-delay': `${index * 65}ms`,
                }}
              >
                <span className="worker-node" aria-hidden="true" />
                <h3>{worker.name}</h3>
                <p>{worker.description}</p>
              </article>
            ))}
          </div>
        </div>

        <button
          className="scroll-cue page-switch page-back"
          type="button"
          onClick={() => showPage(1)}
          aria-label="返回熊二介绍页"
        >
          <span>BACK</span><i />
        </button>

        <button
          className="scroll-cue page-switch page-next"
          type="button"
          onClick={() => showPage(3)}
          aria-label="进入电脑端介绍页"
        >
          <span>NEXT</span><i />
        </button>
      </section>

      <section
        className={`computer-side page-panel ${getPageState(3)}`}
        id="computer-side"
        aria-labelledby="computer-side-title"
        aria-hidden={activePage !== 3}
      >
        <div className="computer-side-halo" aria-hidden="true" />

        <div className="computer-flow-panel">
          <h2 id="computer-side-title">电脑端</h2>
          <p className="agent-loop-title">agent 核心循环：<code>respond(&nbsp;&nbsp;&nbsp;)</code></p>

          <div className="agent-flow" aria-label="Agent 核心循环流程">
            {AGENT_LOOP.map((step, index) => (
              <div className="agent-flow-step-wrap" key={step}>
                <div className={`agent-flow-step${index === 0 ? ' is-origin' : ''}`}>
                  <span className="agent-flow-index">{String(index + 1).padStart(2, '0')}</span>
                  <span>{step}</span>
                </div>
                {index < AGENT_LOOP.length - 1 && (
                  <span className="agent-flow-arrow" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={`tool-stage${toolsExpanded ? ' is-expanded' : ''}`}>
          <div
            className="tool-trigger"
            role="button"
            tabIndex={toolsExpanded ? -1 : 0}
            aria-expanded={toolsExpanded}
            aria-controls="tool-groups"
            onClick={() => setToolsExpanded(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setToolsExpanded(true)
              }
            }}
          >
            <BorderGlow
              edgeSensitivity={30}
              glowColor="40 80 80"
              backgroundColor="#120F17"
              borderRadius={28}
              glowRadius={40}
              glowIntensity={1}
              coneSpread={25}
              animated={false}
              colors={['#38bdf8', '#c084fc', '#f472b6']}
              className="tool-hub"
            >
              <div className="tool-hub-content">
                <span className="tool-hub-kicker">AGENT TOOLBOX</span>
                <h3>我们注册了很多 tool，能完成什么取决于你的想象力！</h3>
                <span className="tool-hub-action">点击展开 · 34 TOOLS</span>
              </div>
            </BorderGlow>
          </div>

          <div className="tool-groups" id="tool-groups" aria-hidden={!toolsExpanded}>
            {TOOL_GROUPS.map((group, groupIndex) => (
              <article
                className="tool-group-card"
                key={group.title}
                style={{
                  '--tool-left': group.left,
                  '--tool-top': group.top,
                  '--tool-delay': `${groupIndex * 75}ms`,
                }}
              >
                <header>
                  <span className="tool-group-node" aria-hidden="true" />
                  <h3>{group.title}</h3>
                  <span>{String(group.tools.length).padStart(2, '0')}</span>
                </header>
                <ul>
                  {group.tools.map(([number, name, description]) => (
                    <li key={`${group.title}-${name}`}>
                      <span className="tool-number">{number}</span>
                      <code>{name}</code>
                      <span>{description}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <button
          className="scroll-cue page-switch page-back"
          type="button"
          onClick={() => showPage(2)}
          aria-label="返回小车端介绍页"
        >
          <span>BACK</span><i />
        </button>


        <button
          className="scroll-cue page-switch page-next"
          type="button"
          onClick={() => showPage(4)}
          aria-label="进入模型与影像介绍页"
        >
          <span>NEXT</span><i />
        </button>
      </section>

      <section
        className={`final-showcase page-panel ${getPageState(4)}`}
        id="model-showcase"
        aria-labelledby="model-showcase-title"
        aria-hidden={activePage !== 4}
      >
        <div className="final-showcase-halo" aria-hidden="true" />

        <div className="model-stack">
          <p className="model-stack-kicker">INTELLIGENCE STACK</p>
          <h2 id="model-showcase-title">我们调用的模型</h2>
          <div className="model-list">
            {MODEL_STACK.map(([name, description], index) => (
              <article className="model-item" key={name} style={{ '--model-delay': `${220 + index * 75}ms` }}>
                <span className="model-index">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{name}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="final-media-column">
          <div className="photo-expand-shell">
            {activePage === 4 && (
              <ScrollExpand
                key={finalPageCycle}
                src="/xionger-first-photo.jpg"
                alt="熊二拍摄的第一张照片"
                title="在我测试小车的摄像功能的时候，拍摄了“熊二”的第一张照片……"
                scrollHint="滚动鼠标 · 展开照片"
                startWidth={50}
                startHeight={56}
                startRadius={26}
                endRadius={14}
                mediaZoom={1.24}
                scrollDistance={1.05}
                holdDistance={0.15}
              />
            )}
          </div>

          <blockquote className="final-note">
            <p>小车还有很多好玩的功能，生气了会抖，伤心了会摇，开心了会舞，还可以用语音让他定闹铃，不喜欢动手定闹铃的小伙伴有福了，还有天气查询、知识科普、偷拍室友……</p>
            <footer>“熊二，你个傻蛋！嘿嘿&nbsp; : - ) &nbsp;……”</footer>
          </blockquote>
        </div>

        <button
          className="scroll-cue page-switch page-back"
          type="button"
          onClick={() => showPage(3)}
          aria-label="返回电脑端介绍页"
        >
          <span>BACK</span><i />
        </button>

        <button
          className="scroll-cue page-switch page-next"
          type="button"
          onClick={() => showPage(5)}
          aria-label="进入项目反思与视频演示页"
        >
          <span>NEXT</span><i />
        </button>
      </section>

      <section
        className={`limitations-page page-panel ${getPageState(5)}`}
        id="limitations"
        aria-labelledby="limitations-title"
        aria-hidden={activePage !== 5}
      >
        <div className="limitations-halo" aria-hidden="true" />

        <div className="limitations-copy">
          <p className="limitations-kicker">WHAT WE LEARNED</p>
          <h2 id="limitations-title">熊二目前存在的问题<br />我们也不藏着掖着</h2>

          <div className="limitations-text">
            <p>因为 ESP 和电脑通过手机热点连接，网络传输速度有延迟。加上我们的 Agent 设计极为要求安全和智能，导致中心 LLM 不是一次指令就结束了，而是要规划、接受工具执行结束的结果、思考需求和结果的匹配程度，决定继续调用工具还是输出。</p>
            <p>每一个工具执行完了不是就结束了，是否遇到困难、动作是否真正执行，都会写入结果信息，再重新发给 LLM 用以思考。</p>
            <p>这样的好处是可以执行多步而复杂的命令。比如：跳舞，然后拍一张照片，发布到媒体箱，同时再把这个照片编辑成动漫风格，发送到媒体箱。</p>
            <p>但是传输的步骤多，每一步都要经过网络的延迟，导致熊二的思考时间不能缩短。同时因为时间原因，Agent 的架构也并没有遵循当前比较强的、由 Planner LLM、Executor LLM、Aggregator LLM 组成的递归搜索式架构。</p>
            <p>同时，工具栏还可以继续丰富。</p>
          </div>
        </div>

        <div className="demo-video-stack" aria-label="熊二功能演示视频">
          {activePage === 5 && (
            <>
              <article className="demo-video-card">
                <header><span>DEMO 01</span><p>熊二功能演示</p></header>
                <video controls preload="metadata" playsInline aria-label="熊二功能演示视频一">
                  <source src="/xionger-demo-01.mp4" type="video/mp4" />
                  当前浏览器不支持视频播放。
                </video>
              </article>

              <article className="demo-video-card">
                <header><span>DEMO 02</span><p>熊二功能演示</p></header>
                <video controls preload="metadata" playsInline aria-label="熊二功能演示视频二">
                  <source src="/xionger-demo-02.mp4" type="video/mp4" />
                  当前浏览器不支持视频播放。
                </video>
              </article>
            </>
          )}
        </div>

        <button
          className="scroll-cue page-switch page-back"
          type="button"
          onClick={() => showPage(4)}
          aria-label="返回模型与影像介绍页"
        >
          <span>BACK</span><i />
        </button>
      </section>

      <Dock
        items={dockItems}
        panelHeight={68}
        baseItemSize={50}
        magnification={70}
        distance={180}
      />
    </main>
  )
}

export default App
