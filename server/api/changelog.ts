import rawVersions from '~~/versiones/versions.json'
import { parseMarkdown } from '@nuxtjs/mdc/runtime'

// 🔥 sorter
function compareVersions(a?: string, b?: string): number {
  if (!a || !b) return 0
  const pa = a.split('-')[0]?.split('.').map(Number) ?? []
  const pb = b.split('-')[0]?.split('.').map(Number) ?? []
  for (let i = 0; i < 3; i++) {
    if ((pb[i] || 0) !== (pa[i] || 0)) {
      return (pb[i] || 0) - (pa[i] || 0) // versiones más recientes primero
    }
  }
  return 0
}

// 🧠 markdown generator
function generateMarkdown(v: any) {
  let md = ''
  if (v.notes) md += `> ${v.notes}\n\n`

  if (v.changes?.length) {
    const grouped: Record<string, Record<string, any[]>> = {}
    for (const c of v.changes) {
      if (!c.type) continue
      const type = c.type
      const scope = c.scope || 'general'
      grouped[type] ??= {}
      grouped[type][scope] ??= []
      grouped[type][scope].push(c)
    }

    const order = ['feat', 'fix', 'refactor', 'perf', 'docs']
    const titleMap: Record<string, string> = {
      feat: '✨ Features',
      fix: '🐛 Bug Fixes',
      refactor: '♻️ Refactor',
      perf: '⚡ Performance',
      docs: '📝 Docs'
    }
    const badgeMap: Record<string, string> = {
      feat: '✨',
      fix: '🐛',
      refactor: '♻️',
      perf: '⚡',
      docs: '📝'
    }

    for (const type of order) {
      const scopes = grouped[type]
      if (!scopes) continue
      md += `---\n\n`
      md += `### ${titleMap[type] || type}\n\n`
      for (const [scope, items] of Object.entries(scopes)) {
        md += `#### ${scope}\n\n`
        for (const c of items) {
          const badge = badgeMap[type] || ''
          if (c.url && c.id)
            md += `- ${badge} [${c.id}](${c.url}) - ${c.title}\n`
          else md += `- ${badge} ${c.title}\n`
          if (c.description) md += `  - ${c.description}\n`
        }
        md += `\n`
      }
    }
  }

  if (v.modules?.length) {
    md += `---\n\n### 📦 Modules\n\n`
    for (const m of v.modules) {
      md += `- **${m.name}** → \`${m.version}\`\n`
    }
  }

  if (!md.trim()) md = '_Sin contenido_'
  return md
}

// 🧾 types
type ChangelogVersion = {
  tag: string
  title: string
  date: string
  body: any // MDCRoot
}

// 🚀 handler
export default defineEventHandler(async () => {
  const sorted = rawVersions
    .slice()
    .sort((a, b) => compareVersions(a.version, b.version))
  const parsed: ChangelogVersion[] = await Promise.all(
    sorted.map(async (v: any) => {
      const md = generateMarkdown(v)
      const parsed = await parseMarkdown(md)
      return {
        tag: v.version,
        title: `v${v.version}`,
        date: v.date,
        body: parsed.body
      }
    })
  )
  return parsed
})
