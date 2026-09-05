<script setup lang="ts">
import type { WidgetConfig, WidgetSize } from '~/modulos/erp/dashboard/types/dashboard.types'
import { AVAILABLE_WIDGETS } from '~/modulos/erp/dashboard/composables/useDashboardConfig'

const props = defineProps<{
  open: boolean
  widgets: WidgetConfig[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:widgets': [value: WidgetConfig[]]
  'reset': []
}>()

const sortedWidgets = ref<WidgetConfig[]>([])

const sizeOptions: { label: string; value: WidgetSize }[] = [
  { label: 'Normal', value: 'sm' },
  { label: 'Vertical', value: 'md' },
  { label: 'Horizontal', value: 'lg' },
]

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    sortedWidgets.value = [...props.widgets].sort((a, b) => a.position - b.position)
  }
})

const emitUpdate = () => {
  const updated = sortedWidgets.value.map((w, i) => ({ ...w, position: i }))
  emit('update:widgets', updated)
}

const getWidgetInfo = (id: string) => {
  return AVAILABLE_WIDGETS.find((w) => w.id === id)
}

const toggleWidget = (id: string) => {
  const widget = sortedWidgets.value.find((w) => w.id === id)
  if (widget) {
    widget.enabled = !widget.enabled
    emitUpdate()
  }
}

const changeSize = (id: string, newSize: WidgetSize) => {
  const widget = sortedWidgets.value.find((w) => w.id === id)
  if (widget) {
    widget.size = newSize
    emitUpdate()
  }
}

const moveToPosition = (id: string, newPos: string) => {
  const newIndex = parseInt(newPos)
  const currentIndex = sortedWidgets.value.findIndex((w) => w.id === id)
  if (currentIndex === -1 || newIndex === currentIndex) return

  const [moved] = sortedWidgets.value.splice(currentIndex, 1)
  sortedWidgets.value.splice(newIndex, 0, moved)
  emitUpdate()
}

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
    title="Configurar Dashboard"
    description="Reordená, activá o desactivá widgets y cambiá su tamaño"
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <div class="space-y-2">
        <div
          v-for="(widget, index) in sortedWidgets"
          :key="widget.id"
          class="flex items-center gap-2 p-3 rounded-lg border border-default bg-muted/20 hover:bg-muted/40 transition-colors"
        >
          <USelect
            :model-value="String(index)"
            :items="positionOptions"
            size="xs"
            class="w-20 shrink-0"
            @update:model-value="moveToPosition(widget.id, $event)"
          />

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <UIcon :name="getWidgetInfo(widget.id)?.icon ?? 'i-lucide-widget'" class="size-4 text-muted shrink-0" />
              <span class="text-sm font-medium truncate">{{ getWidgetInfo(widget.id)?.label ?? widget.id }}</span>
            </div>
            <p class="text-xs text-muted mt-0.5 truncate">{{ getWidgetInfo(widget.id)?.description }}</p>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <UButtonGroup size="xs">
              <UButton
                v-for="opt in sizeOptions"
                :key="opt.value"
                :label="opt.label"
                :color="widget.size === opt.value ? 'primary' : 'neutral'"
                :variant="widget.size === opt.value ? 'solid' : 'ghost'"
                @click="changeSize(widget.id, opt.value)"
              />
            </UButtonGroup>
            <UButton
              :label="widget.enabled ? 'Visible' : 'Oculto'"
              :color="widget.enabled ? 'success' : 'error'"
              variant="outline"
              size="xs"
              @click="toggleWidget(widget.id)"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between">
        <UButton label="Restablecer" variant="ghost" color="error" size="sm" @click="emit('reset')" />
        <UButton label="Cerrar" variant="outline" size="sm" @click="emit('update:open', false)" />
      </div>
    </template>
  </UModal>
</template>
