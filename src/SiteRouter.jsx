import { useEffect, useState } from 'react'
import ProjectApp from './App'
import ResumeApp from './ResumeApp'
import NotesApp from './NotesApp'

const getRoute = () => {
  if (window.location.hash.startsWith('#/project')) return 'project'
  if (window.location.hash.startsWith('#/notes')) return 'notes'
  return 'home'
}

function SiteRouter() {
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const onHashChange = () => {
      setRoute(getRoute())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (route === 'project') {
      document.documentElement.dataset.site = 'project'
      document.title = 'ESP32-S3 多模态智能体 — Yize'
    } else if (route === 'notes') {
      document.title = '笔记 — Yize'
    } else {
      document.title = 'Yize — Personal Website'
    }
  }, [route])

  if (route === 'home') return <ResumeApp />
  if (route === 'notes') return <NotesApp />

  return (
    <div className="project-route">
      <ProjectApp />
      <button
        className="return-home-button"
        type="button"
        onClick={() => { window.location.hash = '/' }}
        aria-label="返回 Yize 的个人主页"
      >
        <span aria-hidden="true">←</span>
        <span><small>BACK TO PORTFOLIO</small>返回主网页</span>
      </button>
    </div>
  )
}

export default SiteRouter
