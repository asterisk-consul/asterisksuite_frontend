import rawVersions from '~~/versiones/versions.json'

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

// 🚀 handler
export default defineEventHandler(() => {
  return rawVersions
    .slice()
    .sort((a, b) => compareVersions(a.version, b.version))
    .map((version, index) => {
      const tag = version.version || `sin-version-${index + 1}`

      return {
        tag,
        title: version.version ? `v${version.version}` : 'Versión sin identificar',
        date: version.date,
        notes: version.notes || null,
        message: version.message || null,
        changes: version.changes || [],
        modules: version.modules || []
      }
    })
})
