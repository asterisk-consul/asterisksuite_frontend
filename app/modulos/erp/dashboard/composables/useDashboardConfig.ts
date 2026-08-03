import type { DashboardWidget, WidgetConfig, DashboardConfig, DashboardData, WidgetSize } from '../types/dashboard.types'

export interface GridLayout {
  gridColumn: string
  gridRow: string
}

export const AVAILABLE_WIDGETS: DashboardWidget[] = [
  { id: 'financial', label: 'Finanzas', icon: 'i-lucide-landmark', description: 'Saldos bancarios y cajas', defaultEnabled: true, defaultPosition: 0, defaultSize: 'md' },
  { id: 'quotes', label: 'Presupuestos', icon: 'i-lucide-file-text', description: 'Presupuestos por estado', defaultEnabled: true, defaultPosition: 1, defaultSize: 'sm' },
  { id: 'orders', label: 'Órdenes de Venta', icon: 'i-lucide-shopping-cart', description: 'OVs pendientes de entrega', defaultEnabled: true, defaultPosition: 2, defaultSize: 'sm' },
  { id: 'remitos', label: 'Remitos', icon: 'i-lucide-truck', description: 'Remitos por estado', defaultEnabled: true, defaultPosition: 3, defaultSize: 'sm' },
  { id: 'hr', label: 'RRHH', icon: 'i-lucide-users', description: 'Empleados y vales', defaultEnabled: true, defaultPosition: 4, defaultSize: 'sm' },
  { id: 'stock', label: 'Stock', icon: 'i-lucide-box', description: 'Productos con stock', defaultEnabled: true, defaultPosition: 5, defaultSize: 'sm' },
  { id: 'quick_actions', label: 'Accesos Directos', icon: 'i-lucide-zap', description: 'Atajos a módulos', defaultEnabled: true, defaultPosition: 6, defaultSize: 'lg' },
  { id: 'chart', label: 'Gráfico', icon: 'i-lucide-bar-chart-3', description: 'Gráfico de resumen', defaultEnabled: true, defaultPosition: 7, defaultSize: 'lg' },
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
      const data = await $fetch<DashboardConfig | null>('/api/erp/dashboard/config', {
        params: { dashboard_key: 'home' },
      })
      if (data?.widgets && data.widgets.length > 0) {
        config.value = data.widgets.map((w) => ({
          ...w,
          size: w.size || 'sm',
        }))
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
      await $fetch('/api/erp/dashboard/config', {
        method: 'POST',
        body: { dashboard_key: 'home', widgets: config.value },
      })
    } catch {
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
      widget.size = SIZE_CYCLE[(idx + 1) % SIZE_CYCLE.length]
      saveConfig()
    }
  }

  const moveWidget = (id: string, direction: 'up' | 'down') => {
    const sorted = [...config.value].sort((a, b) => a.position - b.position)
    const index = sorted.findIndex((w) => w.id === id)
    if (index === -1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= sorted.length) return

    const temp = sorted[index].position
    sorted[index].position = sorted[targetIndex].position
    sorted[targetIndex].position = temp

    config.value = sorted
    saveConfig()
  }

  const resetConfig = () => {
    config.value = [...DEFAULT_WIDGETS]
    saveConfig()
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
