import type { DashboardWidget, WidgetConfig, DashboardConfig, DashboardData, WidgetSize } from '../types/dashboard.types'

export interface GridLayout {
  gridColumn: string
  gridRow: string
}

export const AVAILABLE_WIDGETS: DashboardWidget[] = [
  { id: 'personal', label: 'Mi actividad', icon: 'i-lucide-user', description: 'Resumen de tu actividad personal', defaultEnabled: true, defaultPosition: 0, defaultSize: 'sm', category: 'personal' },
  { id: 'exchange_rate', label: 'Dólar del día', icon: 'i-lucide-badge-dollar-sign', description: 'Cotización oficial y blue actualizada', defaultEnabled: true, defaultPosition: 1, defaultSize: 'sm', permissions: ['documents.read', 'payments.read', 'currency_rates.read', 'international_operations.read'], category: 'treasury' },
  { id: 'financial', label: 'Finanzas', icon: 'i-lucide-landmark', description: 'Saldos bancarios y cajas', defaultEnabled: true, defaultPosition: 2, defaultSize: 'md', permission: 'bank_accounts.read', category: 'treasury' },
  { id: 'quotes', label: 'Presupuestos', icon: 'i-lucide-file-text', description: 'Presupuestos por estado', defaultEnabled: true, defaultPosition: 2, defaultSize: 'sm', permission: 'documents.read', category: 'commercial' },
  { id: 'orders', label: 'Órdenes de venta', icon: 'i-lucide-shopping-cart', description: 'Órdenes pendientes de entrega', defaultEnabled: true, defaultPosition: 3, defaultSize: 'sm', permission: 'documents.read', category: 'commercial' },
  { id: 'remitos', label: 'Remitos', icon: 'i-lucide-truck', description: 'Remitos por estado', defaultEnabled: true, defaultPosition: 4, defaultSize: 'sm', permission: 'documents.read', category: 'commercial' },
  { id: 'hr', label: 'RR. HH.', icon: 'i-lucide-users', description: 'Empleados y vales', defaultEnabled: true, defaultPosition: 5, defaultSize: 'sm', permission: 'employees.read', category: 'people' },
  { id: 'stock', label: 'Stock', icon: 'i-lucide-box', description: 'Productos con stock', defaultEnabled: true, defaultPosition: 6, defaultSize: 'sm', permission: 'products.read', category: 'operations' },
  { id: 'receivables', label: 'Documentos por cobrar', icon: 'i-lucide-receipt', description: 'Facturas de venta con saldo pendiente', defaultEnabled: true, defaultPosition: 7, defaultSize: 'sm', permission: 'documents.read', category: 'treasury' },
  { id: 'costing', label: 'Costeados vs. no costeados', icon: 'i-lucide-calculator', description: 'Productos con y sin snapshot de costeo', defaultEnabled: true, defaultPosition: 8, defaultSize: 'sm', permission: 'products.read', category: 'operations' },
  { id: 'current_accounts', label: 'Cuentas corrientes', icon: 'i-lucide-book-open', description: 'Principales cuentas por saldo', defaultEnabled: true, defaultPosition: 9, defaultSize: 'sm', permission: 'bank_accounts.read', category: 'treasury' },
  { id: 'picking', label: 'Picking pendiente', icon: 'i-lucide-package-check', description: 'Órdenes de picking sin ejecutar', defaultEnabled: true, defaultPosition: 10, defaultSize: 'sm', permission: 'picking.read', category: 'operations' },
  { id: 'active_trips', label: 'Viajes activos', icon: 'i-lucide-route', description: 'Viajes planificados y en curso', defaultEnabled: true, defaultPosition: 11, defaultSize: 'sm', permission: 'trips.read', category: 'operations' },
  { id: 'checks_due', label: 'Cheques a vencer', icon: 'i-lucide-calendar-clock', description: 'Cheques propios a vencer en 30 días', defaultEnabled: true, defaultPosition: 12, defaultSize: 'sm', permission: 'checks.read', category: 'treasury' },
  { id: 'payments_due', label: 'Pagos y cobros pendientes', icon: 'i-lucide-hourglass', description: 'Pagos y cobros confirmados sin liquidar', defaultEnabled: true, defaultPosition: 13, defaultSize: 'sm', permission: 'payments.read', category: 'treasury' },
  { id: 'quick_actions', label: 'Accesos directos', icon: 'i-lucide-zap', description: 'Atajos a módulos', defaultEnabled: true, defaultPosition: 14, defaultSize: 'lg', category: 'personal' },
  { id: 'chart', label: 'Resumen gráfico', icon: 'i-lucide-bar-chart-3', description: 'Indicadores visuales de la empresa', defaultEnabled: true, defaultPosition: 15, defaultSize: 'lg', permission: 'documents.read', category: 'commercial' },
]

export const DEFAULT_WIDGETS: WidgetConfig[] = AVAILABLE_WIDGETS.map((w) => ({
  id: w.id,
  enabled: w.defaultEnabled,
  position: w.defaultPosition,
  size: w.defaultSize,
}))

export function buildLayout(widgets: WidgetConfig[]): Map<string, GridLayout> {
  const layout = new Map<string, GridLayout>()

  for (const widget of widgets) {
    const size = widget.size ?? 'sm'

    layout.set(widget.id, {
      gridColumn: size === 'lg' ? '1 / -1' : 'span 1',
      gridRow: size === 'md' ? 'span 2' : 'span 1',
    })
  }

  return layout
}

const SIZE_CYCLE: WidgetSize[] = ['sm', 'md', 'lg']

export function useDashboardConfig() {
  const config = ref<WidgetConfig[]>([...DEFAULT_WIDGETS])
  const loading = ref(false)

  const enabledWidgets = computed(() =>
    config.value
      .filter((w) => w.enabled)
      .sort((a, b) => a.position - b.position)
  )

  const fetchConfig = async () => {
    loading.value = true
    try {
      const data = await $fetch<DashboardConfig | null>('/api/backend/dashboard/config', {
        params: { dashboard_key: 'home' },
      })
      if (data?.widgets && data.widgets.length > 0) {
        const saved = data.widgets.map((w) => ({
          ...w,
          size: w.size || 'sm',
        }))
        const savedIds = new Set(saved.map((w) => w.id))
        const newWidgets = DEFAULT_WIDGETS
          .filter((w) => !savedIds.has(w.id))
          .sort((a, b) => a.position - b.position)
        const merged = [...saved].sort((a, b) => a.position - b.position)
        for (const widget of newWidgets) {
          merged.splice(Math.min(widget.position, merged.length), 0, widget)
        }
        config.value = merged.map((widget, position) => ({ ...widget, position }))
      }
    } catch {
      config.value = [...DEFAULT_WIDGETS]
    } finally {
      loading.value = false
    }
  }

  const saveConfig = async () => {
    loading.value = true
    try {
      await $fetch('/api/backend/dashboard/config', {
        method: 'POST',
        body: { dashboard_key: 'home', widgets: config.value },
      })
      return true
    } catch {
      return false
    } finally {
      loading.value = false
    }
  }

  const toggleWidget = (id: string) => {
    const widget = config.value.find((w) => w.id === id)
    if (widget) {
      widget.enabled = !widget.enabled
      saveConfig()
    }
  }

  const toggleSize = (id: string) => {
    const widget = config.value.find((w) => w.id === id)
    if (widget) {
      const idx = SIZE_CYCLE.indexOf(widget.size)
      widget.size = SIZE_CYCLE[(idx + 1) % SIZE_CYCLE.length] ?? 'sm'
      saveConfig()
    }
  }

  const moveWidget = (id: string, direction: 'up' | 'down') => {
    const sorted = [...config.value].sort((a, b) => a.position - b.position)
    const index = sorted.findIndex((w) => w.id === id)
    if (index === -1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= sorted.length) return

    const current = sorted[index]
    const target = sorted[targetIndex]
    if (!current || !target) return
    const temp = current.position
    current.position = target.position
    target.position = temp

    config.value = sorted
    saveConfig()
  }

  const resetConfig = async () => {
    config.value = [...DEFAULT_WIDGETS]
    return await saveConfig()
  }

  return {
    config,
    loading,
    enabledWidgets,
    fetchConfig,
    saveConfig,
    toggleWidget,
    toggleSize,
    moveWidget,
    resetConfig,
  }
}
