export interface PerformanceMetricPayload {
  kind: 'initial-load' | 'route-navigation'
  route: string
  version?: string
  metrics: Record<string, number>
}

export const sendPerformanceMetric = (payload: PerformanceMetricPayload) => {
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
