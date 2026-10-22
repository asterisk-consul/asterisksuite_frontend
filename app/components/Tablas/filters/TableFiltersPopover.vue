<script setup lang="ts">
import FilterValueInput from './FilterValueInput.vue'
import type { TableFilter, ColumnFilterMeta, FilterOperator } from '../types/tablas.types'

const props = defineProps<{
  filters: TableFilter[]
  columns: any[]
}>()

const emit = defineEmits<{
  add: []
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
    <UPopover>
      <div class="relative inline-flex">
        <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-list-filter" label="Filtros" class="min-w-24 justify-center" />
        <UBadge
          v-if="filters.length"
          :label="String(filters.length)"
          color="primary"
          size="xs"
          class="pointer-events-none absolute -right-2 -top-2 min-w-5 justify-center rounded-full px-1"
        />
      </div>

      <template #content>
        <div class="w-[min(92vw,760px)] p-4 flex flex-col gap-3">
          <div>
            <p class="text-sm font-medium">Filtros avanzados</p>
            <p class="text-xs text-muted">Combiná campos para acotar los resultados de la tabla.</p>
          </div>

          <div v-if="filters.length" class="flex flex-wrap gap-1.5 border-b border-default pb-3">
            <UBadge
              v-for="filter in filters"
              :key="`summary-${filter.id}`"
              color="neutral"
              variant="soft"
              class="max-w-full px-2 py-1"
            >
              <span class="mr-1 font-medium">{{ getColumnLabel(filter.column) }}</span>
              <span class="mr-1 opacity-60">{{ formatOperator(filter.operator) }}</span>
              <span class="max-w-40 truncate">
                {{ typeof filter.value === 'object' ? 'Seleccionado' : filter.value || 'Sin valor' }}
              </span>
            </UBadge>
          </div>

          <!-- ✅ Guard: solo renderiza si hay columnas -->
          <template v-if="filterableColumns.length">
            <div
              v-for="filter in filters"
              :key="filter.id"
              class="grid grid-cols-1 gap-2 rounded-lg border border-default bg-elevated/40 p-2 sm:grid-cols-[minmax(150px,1fr)_150px_minmax(180px,1.4fr)_auto] sm:items-start"
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
          <div class="flex items-center justify-between border-t border-default pt-3">
            <UButton icon="i-lucide-plus" variant="soft" size="sm" :disabled="!filterableColumns.length" @click="emit('add')">
              Agregar filtro
            </UButton>
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>
