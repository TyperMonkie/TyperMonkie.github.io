import { useEffect, useMemo, useRef, useState } from 'react'
import PortfolioBackdrop from './components/PortfolioBackdrop'
import { bundledNotes, parseMarkdownNote } from './lib/notes'
import './resume.css'
import './notes.css'

const ArrowBack = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
)

function NotesApp() {
  const [localNotes, setLocalNotes] = useState([])
  const [activeCategory, setActiveCategory] = useState('全部')
  const [selectedSlug, setSelectedSlug] = useState(bundledNotes[0]?.slug || '')
  const fileInputRef = useRef(null)

  const notes = useMemo(() => [...localNotes, ...bundledNotes], [localNotes])
  const categories = useMemo(() => ['全部', ...new Set(notes.map((note) => note.category))], [notes])
  const visibleNotes = activeCategory === '全部'
    ? notes
    : notes.filter((note) => note.category === activeCategory)
  const selectedNote = visibleNotes.find((note) => note.slug === selectedSlug) || visibleNotes[0]

  useEffect(() => {
    document.documentElement.dataset.site = 'resume'
    document.documentElement.removeAttribute('data-theme')
    document.title = '笔记 — Yize'
    return () => { delete document.documentElement.dataset.site }
  }, [])

  const selectCategory = (category) => {
    const firstNote = category === '全部'
      ? notes[0]
      : notes.find((note) => note.category === category)
    setActiveCategory(category)
    setSelectedSlug(firstNote?.slug || '')
  }

  const importMarkdown = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const note = parseMarkdownNote(await file.text(), file.name, true)
    setLocalNotes((current) => [note, ...current.filter((item) => item.slug !== note.slug)])
    setActiveCategory('本地导入')
    setSelectedSlug(note.slug)
    event.target.value = ''
  }

  return (
    <main className="resume-site notes-site">
      <PortfolioBackdrop />

      <div className="notes-shell">
        <aside className="notes-nav glass-panel" aria-label="笔记分区">
          <div>
            <button className="notes-back" type="button" onClick={() => { window.location.hash = '/' }}>
              <ArrowBack /><span>返回主页</span>
            </button>
            <div className="notes-brand">
              <span className="signature-mark">Y</span>
              <span><strong>YIZE NOTES</strong><small>MARKDOWN ARCHIVE</small></span>
            </div>
          </div>

          <nav className="notes-categories">
            <p>笔记分区</p>
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                className={activeCategory === category ? 'is-active' : ''}
                onClick={() => selectCategory(category)}
              >
                <span>{category}</span>
                <small>{category === '全部' ? notes.length : notes.filter((note) => note.category === category).length}</small>
              </button>
            ))}
          </nav>

          <div className="notes-import">
            <input ref={fileInputRef} type="file" accept=".md,text/markdown,text/plain" onChange={importMarkdown} />
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              <span>＋</span><span><strong>导入 Markdown</strong><small>仅在当前浏览中预览</small></span>
            </button>
          </div>
        </aside>

        <section className="notes-main glass-panel" aria-label="笔记正文">
          <header className="notes-header">
            <div><span>YIZE / NOTES</span><h1>笔记</h1></div>
            <p>{String(visibleNotes.length).padStart(2, '0')} ARTICLES</p>
          </header>

          {visibleNotes.length > 0 ? (
            <>
              <div className="notes-list" aria-label="文章列表">
                {visibleNotes.map((note, index) => (
                  <button
                    type="button"
                    key={`${note.local ? 'local-' : ''}${note.slug}`}
                    className={selectedNote?.slug === note.slug ? 'is-active' : ''}
                    onClick={() => setSelectedSlug(note.slug)}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <span><strong>{note.title}</strong><small>{note.summary || note.category}</small></span>
                    <time>{note.date || '未标日期'}</time>
                  </button>
                ))}
              </div>

              {selectedNote && (
                <article className="markdown-note" key={selectedNote.slug}>
                  <header>
                    <div><span>{selectedNote.category}</span>{selectedNote.local && <span>本地预览</span>}</div>
                    <h2>{selectedNote.title}</h2>
                    {selectedNote.summary && <p>{selectedNote.summary}</p>}
                    {selectedNote.date && <time>{selectedNote.date}</time>}
                  </header>
                  <div className="markdown-body" dangerouslySetInnerHTML={{ __html: selectedNote.html }} />
                </article>
              )}
            </>
          ) : (
            <div className="notes-empty"><span>EMPTY SECTION</span><p>这个分区还没有笔记。</p></div>
          )}
        </section>
      </div>
    </main>
  )
}

export default NotesApp
