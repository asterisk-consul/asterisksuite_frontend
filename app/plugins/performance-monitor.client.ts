type PerformancePayload = {
  kind: 'initial-load' | 'route-navigation'
  route: string
  version?: string
  metrics: Record<string, number>
}

function rounded(value: number | undefined) {
  return Math.max(0, Math.round(Number(value ?? 0)))
}

function sendMetric(payload: PerformancePayload) {
  const body = JSON.stringify(payload)
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/performance', new Blob([body], { type: 'application/json' }))
    return
  }
  void $fetch('/api/performance', {
    method: 'POST',
    body: payload,
    keepalive: true
  }).catch(() => {})
}

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const sampleRate = Math.min(1, Math.max(0, Number(config.public.performanceSampleRate ?? 0)))
  if (sampleRate === 0 || Math.random() > sampleRate) return

  let largestContentfulPaint = 0
  let cumulativeLayoutShift = 0

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      largestContentfulPaint = entries.at(-1)?.startTime ?? largestContentfulPaint
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number }>) {
        if (!entry.hadRecentInput) cumulativeLayoutShift += Number(entry.value ?? 0)
      }
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })
  } catch {
    // Algunos navegadores no exponen todas las métricas Web Vitals.
  }

  const reportInitialLoad = () => {
    window.setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      if (!navigation) return

      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const chunks = resources.filter((entry) => new URL(entry.name).pathname.startsWith('/_nuxt/'))
      const apiCalls = resources.filter((entry) => new URL(entry.name).pathname.startsWith('/api/'))

      sendMetric({
        kind: 'initial-load',
        route: window.location.pathname,
        version: String(config.public.appVersion ?? ''),
        metrics: {
          ttfbMs: rounded(navigation.responseStart),
          domContentLoadedMs: rounded(navigation.domContentLoadedEventEnd),
          loadMs: rounded(navigation.loadEventEnd || performance.now()),
          lcpMs: rounded(largestContentfulPaint),
          clsMilli: rounded(cumulativeLayoutShift * 1000),
          chunkCount: chunks.length,
          chunkDurationMs: rounded(chunks.reduce((total, entry) => total + entry.duration, 0)),
          chunkTransferKb: rounded(chunks.reduce((total, entry) => total + entry.transferSize, 0) / 1024),
          apiCount: apiCalls.length,
          apiDurationMs: rounded(apiCalls.reduce((total, entry) => total + entry.duration, 0)),
          slowestApiMs: rounded(Math.max(0, ...apiCalls.map((entry) => entry.duration)))
        }
      })
    }, 5000)
  }

  if (document.readyState === 'complete') reportInitialLoad()
  else window.addEventListener('load', reportInitialLoad, { once: true })

  let routeStartedAt = 0
  nuxtApp.hook('page:start', () => {
    routeStartedAt = performance.now()
  })
  nuxtApp.hook('page:finish', () => {
    if (!routeStartedAt) return
    sendMetric({
      kind: 'route-navigation',
      route: window.location.pathname,
      version: String(config.public.appVersion ?? ''),
      metrics: { durationMs: rounded(performance.now() - routeStartedAt) }
    })
    routeStartedAt = 0
  })
})
