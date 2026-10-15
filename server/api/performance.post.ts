type PerformanceReport = {
  kind?: string
  route?: string
  version?: string
  metrics?: Record<string, unknown>
}

function sanitizeMetrics(metrics: Record<string, unknown> | undefined) {
  return Object.fromEntries(
    Object.entries(metrics ?? {})
      .slice(0, 20)
      .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
      .map(([key, value]) => [key.slice(0, 40), Math.max(0, Math.min(Number(value), 86_400_000))])
  )
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody<PerformanceReport>(event)
  const route = typeof body?.route === 'string' ? body.route.split('?')[0]?.slice(0, 200) : '/'
  const kind = body?.kind === 'route-navigation' ? 'route-navigation' : 'initial-load'

  console.info(
    '[PERFORMANCE]',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      kind,
      route,
      version: String(body?.version ?? '').slice(0, 40),
      metrics: sanitizeMetrics(body?.metrics)
    })
  )

  return { ok: true }
})
