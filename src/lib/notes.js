import DOMPurify from 'dompurify'
import { marked } from 'marked'

const markdownModules = import.meta.glob('../content/notes/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const noteAssetModules = import.meta.glob('../content/notes/**/*.{png,jpg,jpeg,gif,webp,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const FRONT_MATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*\n?/

const slugify = (value) => value
  .toLowerCase()
  .trim()
  .replace(/\.md$/i, '')
  .replace(/[^\p{L}\p{N}]+/gu, '-')
  .replace(/^-+|-+$/g, '')

const normalizeModulePath = (value) => value
  .replace(/\\/g, '/')
  .split('/')
  .reduce((parts, part) => {
    if (!part || part === '.') return parts
    if (part === '..') parts.pop()
    else parts.push(part)
    return parts
  }, [])
  .join('/')

const bundledAssets = Object.fromEntries(
  Object.entries(noteAssetModules).map(([path, url]) => [normalizeModulePath(path), url]),
)

const resolveBundledAsset = (source, notePath) => {
  if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(source)) return source
  const noteDirectory = notePath.slice(0, notePath.lastIndexOf('/') + 1)
  return bundledAssets[normalizeModulePath(`${noteDirectory}${source}`)] || source
}

const rewriteImageSources = (html, notePath) => html.replace(
  /(<img\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi,
  (_, prefix, source, suffix) => `${prefix}${resolveBundledAsset(source, notePath)}${suffix}`,
)

const parseFrontMatter = (source) => {
  const match = source.match(FRONT_MATTER_PATTERN)
  if (!match) return { attributes: {}, body: source }

  const attributes = {}
  match[1].split('\n').forEach((line) => {
    const separator = line.indexOf(':')
    if (separator === -1) return
    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key) attributes[key] = value
  })

  return { attributes, body: source.slice(match[0].length) }
}

export const parseMarkdownNote = (source, filename = 'untitled.md', local = false) => {
  const { attributes, body } = parseFrontMatter(source)
  const baseName = filename.split(/[\\/]/).pop()?.replace(/\.md$/i, '') || 'untitled'
  const fallbackTitle = body.match(/^#\s+(.+)$/m)?.[1]?.trim() || baseName
  const rawHtml = marked.parse(body, { gfm: true, breaks: false })

  return {
    slug: slugify(attributes.slug || baseName) || `note-${Date.now()}`,
    title: attributes.title || fallbackTitle,
    date: attributes.date || '',
    category: attributes.category || (local ? '本地导入' : '未分类'),
    summary: attributes.summary || '',
    html: DOMPurify.sanitize(rawHtml),
    local,
  }
}

export const bundledNotes = Object.entries(markdownModules)
  .map(([path, source]) => {
    const note = parseMarkdownNote(source, path)
    return { ...note, html: DOMPurify.sanitize(rewriteImageSources(note.html, path)) }
  })
  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
