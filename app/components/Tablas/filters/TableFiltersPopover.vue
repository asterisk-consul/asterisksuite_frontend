<script setup lang="ts">
import FilterValueInput from './FilterValueInput.vue'
import type { TableFilter, ColumnFilterMeta, FilterOperator } from '../types/tablas.types'

const props = defineProps<{
  filters: TableFilter[]
  columns: any[]
}>()
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  add: []
  clear: []
  update: [filter: TableFilter]
  remove: [id: string]
}>()

// ✅ Siempre un array seguro
const safeColumns = computed(() => props.columns ?? [])

// ✅ Solo columnas con id válido y meta de filtro
const filterableColumns = computed(() =>
  safeColumns.value
    .filter((c) => (c.accessorKey || c.id) && c.meta?.filter && c.meta?.filter !== false)
    .map((c) => ({
      label: c.meta?.label || c.header || c.accessorKey || c.id,
      value: c.accessorKey || c.id
    }))
)

function getColumn(column: string) {
  return safeColumns.value.find((c) => c.accessorKey === column || c.id === column)
}

function getColumnMeta(column: string): ColumnFilterMeta | undefined {
  return getColumn(column)?.meta?.filter
}

function getColumnLabel(column: string) {
  const col = getColumn(column)
  return col?.meta?.label || col?.header || column
}

function getFilterValueLabel(filter: TableFilter) {
  const meta = getColumnMeta(filter.column)
  if (meta?.type === 'select') {
    const option = meta.options?.find((item) => String(item.value) === String(filter.value))
    if (option) return option.label
  }
  if (meta?.type === 'boolean') return filter.value ? 'Sí' : 'No'
  if (meta?.type === 'date-range' && filter.value && typeof filter.value === 'object') {
    const start = filter.value.start ? new Date(filter.value.start).toLocaleDateString('es-AR') : ''
    const end = filter.value.end ? new Date(filter.value.end).toLocaleDateString('es-AR') : ''
    if (start && end) return `${start} – ${end}`
    if (start) return `Desde ${start}`
    if (end) return `Hasta ${end}`
    return 'Sin fechas'
  }
  if (filter.value !== null && typeof filter.value === 'object') return 'Seleccionado'
  return filter.value === null || filter.value === undefined || filter.value === '' ? 'Sin valor' : String(filter.value)
}

function getDefaultOperator(type?: string): FilterOperator {
  switch (type) {
    case 'date-range':
      return 'between'
    case 'number':
      return 'equals'
    case 'select':
      return 'equals'
    case 'boolean':
      return 'equals'
    default:
      return 'contains'
  }
}

function getOperators(column: string) {
  const meta = getColumnMeta(column)
  return (meta?.operators ?? [getDefaultOperator(meta?.type)]).map((o) => ({
    label: formatOperator(o),
    value: o
  }))
}

function formatOperator(operator: string) {
  const map: Record<string, string> = {
    contains: 'Contiene',
    equals: 'Igual a',
    startsWith: 'Empieza con',
    between: 'Entre',
    gt: 'Mayor a',
    lt: 'Menor a'
  }
  return map[operator] ?? operator
}

function onColumnChange(filter: TableFilter, column: string) {
  const meta = getColumnMeta(column)
  const updatedFilter = { ...filter, column, operator: getDefaultOperator(meta?.type) }

  switch (meta?.type) {
    case 'date-range':
      updatedFilter.value = { start: undefined, end: undefined }
      break
    case 'boolean':
      updatedFilter.value = false
      break
    default:
      updatedFilter.value = ''
  }
  emit('update', updatedFilter)
}
</script>

<template>
  <div class="shrink-0">
    <UPopover v-model:open="open">
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-lucide-list-filter"
        class="justify-center gap-2"
        aria-keyshortcuts="Control+Shift+F"
        title="Filtros (Ctrl + Shift + F)"
      >
        <span>Filtros</span>
        <UBadge v-if="filters.length" :label="String(filters.length)" color="primary" variant="soft" size="xs" class="min-w-5 justify-center px-1" />
        <KeyboardShortcutHint :keys="['Ctrl', 'Shift', 'F']" size="2xs" />
      </UButton>

      <template #content>
        <div class="w-[min(92vw,760px)] p-4 flex flex-col gap-3">
          <div>
            <p class="text-sm font-medium">Filtros avanzados</p>
            <p class="text-xs text-muted">Combiná condiciones y quitá las que ya no necesitás.</p>
          </div>

          <div v-if="filters.length" class="flex flex-col gap-2 border-b border-default pb-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-xs font-medium text-muted">{{ filters.length }} filtro{{ filters.length === 1 ? '' : 's' }} avanzado{{ filters.length === 1 ? '' : 's' }} activo{{ filters.length === 1 ? '' : 's' }}</p>
              <UButton label="Limpiar filtros" icon="i-lucide-eraser" color="neutral" variant="ghost" size="xs" @click="emit('clear')" />
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="filter in filters"
                :key="`summary-${filter.id}`"
                class="inline-flex max-w-full items-center gap-1 rounded-full border border-default bg-elevated/50 py-0.5 pl-2.5 pr-1 text-xs"
              >
                <span class="max-w-64 truncate">
                  <span class="font-medium">{{ getColumnLabel(filter.column) }}</span>
                  <span class="mx-1 text-muted">{{ formatOperator(filter.operator) }}</span>
                  {{ getFilterValueLabel(filter) }}
                </span>
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  class="shrink-0"
                  :aria-label="`Quitar filtro de ${getColumnLabel(filter.column)}`"
                  @click.stop="emit('remove', filter.id)"
                />
              </span>
            </div>
          </div>

          <!-- ✅ Guard: solo renderiza si hay columnas -->
          <template v-if="filterableColumns.length">
            <div v-if="!filters.length" class="rounded-lg border border-dashed border-default px-4 py-5 text-center">
              <UIcon name="i-lucide-list-filter" class="mx-auto size-5 text-muted" />
              <p class="mt-2 text-sm font-medium">Todavía no agregaste filtros</p>
              <p class="mt-1 text-xs text-muted">Agregá una condición para acotar los resultados de esta tabla.</p>
            </div>
            <div
              v-for="filter in filters"
              :key="filter.id"
              class="grid grid-cols-1 gap-2 rounded-lg border border-default bg-elevated/40 p-2 sm:grid-cols-[minmax(150px,1fr)_150px_minmax(240px,2fr)_auto] sm:items-start"
            >
              <!-- Columna -->
              <USelect
                :model-value="filter.column"
                :items="filterableColumns"
                @update:model-value="(v) => onColumnChange(filter, v)"
              />

              <!-- Operador -->
              <USelect
                :model-value="filter.operator"
                :items="getOperators(filter.column)"
                @update:model-value="(operator) => emit('update', { ...filter, operator: operator as FilterOperator })"
              />

              <!-- Valor -->
              <FilterValueInput
                :model-value="filter.value"
                :meta="getColumnMeta(filter.column)"
                @update:model-value="(value) => emit('update', { ...filter, value })"
              />

              <!-- Eliminar -->
              <UButton class="justify-self-end" color="error" variant="ghost" icon="i-lucide-trash" aria-label="Quitar filtro" @click="emit('remove', filter.id)" />
            </div>
          </template>

          <!-- ✅ Estado vacío si no hay columnas filtrables -->
          <p v-else class="text-sm text-muted text-center py-2">No hay columnas filtrables disponibles.</p>

          <!-- Footer -->
          <div class="flex justify-end border-t border-default pt-3">
            <UButton icon="i-lucide-plus" label="Agregar filtro" variant="soft" size="sm" :disabled="!filterableColumns.length" @click="emit('add')">
            </UButton>
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>
