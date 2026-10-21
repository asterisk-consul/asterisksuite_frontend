<script setup lang="ts">
import type { WidgetConfig, WidgetSize } from '~/modulos/erp/dashboard/types/dashboard.types'
import { AVAILABLE_WIDGETS } from '~/modulos/erp/dashboard/composables/useDashboardConfig'
import { VueDraggable } from 'vue-draggable-plus'

const props = defineProps<{
  open: boolean
  widgets: WidgetConfig[]
  allowedWidgetIds?: string[]
  overviewCards?: { id: string; label: string; icon: string }[]
  overviewOrder?: string[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:widgets': [value: WidgetConfig[]]
  'update:overviewOrder': [value: string[]]
  'reset': []
}>()

const sortedWidgets = ref<WidgetConfig[]>([])
const sortedOverviewCards = ref<{ id: string; label: string; icon: string }[]>([])
const search = ref('')

const sizeOptions: { label: string; value: WidgetSize }[] = [
  { label: 'Normal', value: 'sm' },
  { label: 'Vertical', value: 'md' },
  { label: 'Horizontal', value: 'lg' },
]

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    search.value = ''
    const allowed = new Set(props.allowedWidgetIds ?? props.widgets.map(widget => widget.id))
    sortedWidgets.value = props.widgets
      .filter(widget => allowed.has(widget.id))
      .map(widget => ({ ...widget }))
      .sort((a, b) => a.position - b.position)
    const overviewPositions = new Map((props.overviewOrder ?? []).map((id, index) => [id, index]))
    sortedOverviewCards.value = [...(props.overviewCards ?? [])]
      .sort((a, b) => (overviewPositions.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (overviewPositions.get(b.id) ?? Number.MAX_SAFE_INTEGER))
  }
})

const save = () => {
  const updated = sortedWidgets.value.map((w, i) => ({ ...w, position: i }))
  emit('update:widgets', updated)
  emit('update:overviewOrder', sortedOverviewCards.value.map(card => card.id))
  emit('update:open', false)
}

const getWidgetInfo = (id: string) => {
  return AVAILABLE_WIDGETS.find((w) => w.id === id)
}

const toggleWidget = (id: string) => {
  const widget = sortedWidgets.value.find((w) => w.id === id)
  if (widget) {
    widget.enabled = !widget.enabled
  }
}

const changeSize = (id: string, newSize: WidgetSize) => {
  const widget = sortedWidgets.value.find((w) => w.id === id)
  if (widget) {
    widget.size = newSize
  }
}

const moveToPosition = (id: string, newPos: string) => {
  const newIndex = parseInt(newPos)
  const currentIndex = sortedWidgets.value.findIndex((w) => w.id === id)
  if (currentIndex === -1 || newIndex === currentIndex) return

  const moved = sortedWidgets.value.splice(currentIndex, 1).at(0)
  if (!moved) return
  sortedWidgets.value.splice(newIndex, 0, moved)
}

const filteredWidgets = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('es')
  if (!term) return sortedWidgets.value
  return sortedWidgets.value.filter((widget) => {
    const info = getWidgetInfo(widget.id)
    return `${info?.label ?? ''} ${info?.description ?? ''}`.toLocaleLowerCase('es').includes(term)
  })
})

const enabledCount = computed(() => sortedWidgets.value.filter(widget => widget.enabled).length)

const positionOptions = computed(() =>
  sortedWidgets.value.map((_, i) => ({
    label: String(i + 1),
    value: String(i),
  }))
)
</script>

<template>
  <UModal
    :open="open"
    @update:open="emit('update:open', $event)"
    title="Personalizar inicio"
    description="Elegí qué información querés ver y cómo organizarla. Sólo aparecen opciones habilitadas para tu rol."
    :ui="{ content: 'max-w-4xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <div class="flex flex-col gap-3 rounded-xl border border-default bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
          <UInput v-model="search" icon="i-lucide-search" placeholder="Buscar widget..." class="w-full sm:max-w-sm" />
          <div class="flex items-center gap-2 text-xs text-muted">
            <UIcon name="i-lucide-shield-check" class="size-4 text-primary" />
            {{ enabledCount }} de {{ sortedWidgets.length }} visibles
          </div>
        </div>

        <div v-if="!search" class="flex items-center gap-2 px-1 text-xs text-muted">
          <UIcon name="i-lucide-grip-vertical" class="size-4" />
          Arrastrá los bloques para cambiar el orden.
        </div>

        <section v-if="!search && sortedOverviewCards.length" class="space-y-2 rounded-xl border border-default p-3">
          <div>
            <h3 class="text-sm font-semibold">Tarjetas superiores</h3>
            <p class="text-xs text-muted">Arrastrá para elegir el orden en que aparecen en el carrusel del inicio.</p>
          </div>
          <VueDraggable v-model="sortedOverviewCards" :animation="180" handle=".overview-drag-handle" class="grid gap-2 sm:grid-cols-2">
            <div v-for="card in sortedOverviewCards" :key="card.id" class="flex min-w-0 items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
              <UButton icon="i-lucide-grip-vertical" color="neutral" variant="ghost" size="xs" class="overview-drag-handle cursor-grab touch-none" aria-label="Arrastrar tarjeta" />
              <UIcon :name="card.icon" class="size-4 shrink-0 text-primary" />
              <span class="truncate text-sm">{{ card.label }}</span>
            </div>
          </VueDraggable>
        </section>

        <VueDraggable v-model="sortedWidgets" :animation="180" handle=".dashboard-drag-handle" :disabled="Boolean(search)" class="space-y-2">
          <div
            v-for="widget in filteredWidgets"
            :key="widget.id"
            class="flex flex-col gap-3 rounded-xl border border-default bg-default p-3 transition-colors hover:border-primary/30 hover:bg-elevated/50 sm:flex-row sm:items-center"
            :class="{ 'opacity-60': !widget.enabled }"
          >
          <UButton
            icon="i-lucide-grip-vertical"
            color="neutral"
            variant="ghost"
            size="xs"
            class="dashboard-drag-handle hidden cursor-grab touch-none sm:inline-flex"
            aria-label="Arrastrar widget"
          />
          <USelect
            :model-value="String(sortedWidgets.findIndex(item => item.id === widget.id))"
            :items="positionOptions"
            size="xs"
            class="w-16 shrink-0"
            :disabled="Boolean(search)"
            @update:model-value="moveToPosition(widget.id, $event)"
          />

          <div class="flex min-w-0 flex-1 items-center gap-3">
            <div class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <UIcon :name="getWidgetInfo(widget.id)?.icon ?? 'i-lucide-widget'" class="size-5" />
            </div>
            <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium truncate">{{ getWidgetInfo(widget.id)?.label ?? widget.id }}</span>
            </div>
            <p class="text-xs text-muted mt-0.5 truncate">{{ getWidgetInfo(widget.id)?.description }}</p>
            </div>
          </div>

          <div class="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
            <UButtonGroup v-if="widget.enabled" size="xs">
              <UButton
                v-for="opt in sizeOptions"
                :key="opt.value"
                :label="opt.label"
                :color="widget.size === opt.value ? 'primary' : 'neutral'"
                :variant="widget.size === opt.value ? 'solid' : 'ghost'"
                @click="changeSize(widget.id, opt.value)"
              />
            </UButtonGroup>
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted">{{ widget.enabled ? 'Visible' : 'Oculto' }}</span>
              <USwitch :model-value="widget.enabled" @update:model-value="toggleWidget(widget.id)" />
            </div>
          </div>
          </div>
        </VueDraggable>

        <div v-if="filteredWidgets.length === 0" class="py-10 text-center text-sm text-muted">
          No encontramos widgets con esa búsqueda.
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-between gap-3">
        <UButton label="Restablecer" variant="ghost" color="error" size="sm" @click="emit('reset')" />
        <div class="flex gap-2">
          <UButton label="Cancelar" variant="ghost" color="neutral" size="sm" @click="emit('update:open', false)" />
          <UButton label="Guardar cambios" icon="i-lucide-check" size="sm" @click="save" />
        </div>
      </div>
    </template>
  </UModal>
</template>
