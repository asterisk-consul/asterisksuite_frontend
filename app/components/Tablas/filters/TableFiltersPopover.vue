<script setup lang="ts">
import FilterValueInput from './FilterValueInput.vue'
import type { TableFilter, ColumnFilterMeta, FilterOperator } from '../types/tablas.types'

const props = defineProps<{
  filters: TableFilter[]
  columns: any[]
}>()

const emit = defineEmits<{
  add: []
  remove: [id: string]
}>()

// ✅ Siempre un array seguro
const safeColumns = computed(() => props.columns ?? [])

// ✅ Solo columnas con id válido y meta de filtro
const filterableColumns = computed(() =>
  safeColumns.value
    .filter((c) => (c.accessorKey || c.id) && c.meta?.filter)
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
  filter.column = column
  const meta = getColumnMeta(column)
  filter.operator = getDefaultOperator(meta?.type)

  switch (meta?.type) {
    case 'date-range':
      filter.value = { start: undefined, end: undefined }
      break
    case 'boolean':
      filter.value = false
      break
    default:
      filter.value = ''
  }
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <!-- Chips de filtros activos -->
    <UBadge v-for="filter in filters" :key="filter.id" color="neutral" variant="soft" class="px-3 py-1">
      <div class="flex items-center gap-2">
        <span>{{ getColumnLabel(filter.column) }}</span>
        <span class="opacity-60">{{ formatOperator(filter.operator) }}</span>
        <span class="font-medium">
          {{ typeof filter.value === 'object' ? 'Seleccionado' : filter.value }}
        </span>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="emit('remove', filter.id)" />
      </div>
    </UBadge>

    <!-- Botón Popover -->
    <UPopover>
      <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-filter">
        Filters

        <UBadge v-if="filters.length" :label="String(filters.length)" color="primary" size="xs" class="ml-1" />
      </UButton>

      <template #content>
        <div class="w-225 p-4 flex flex-col gap-3">
          <!-- ✅ Guard: solo renderiza si hay columnas -->
          <template v-if="filterableColumns.length">
            <div
              v-for="filter in filters"
              :key="filter.id"
              class="grid grid-cols-[220px_180px_1fr_auto] gap-2 items-start"
            >
              <!-- Columna -->
              <USelect
                :model-value="filter.column"
                :items="filterableColumns"
                @update:model-value="(v) => onColumnChange(filter, v)"
              />

              <!-- Operador -->
              <USelect v-model="filter.operator" :items="getOperators(filter.column)" />

              <!-- Valor -->
              <FilterValueInput v-model="filter.value" :meta="getColumnMeta(filter.column)" />

              <!-- Eliminar -->
              <UButton color="error" variant="ghost" icon="i-lucide-trash" @click="emit('remove', filter.id)" />
            </div>
          </template>

          <!-- ✅ Estado vacío si no hay columnas filtrables -->
          <p v-else class="text-sm text-muted text-center py-2">No hay columnas filtrables disponibles.</p>

          <!-- Footer -->
          <div class="flex items-center justify-between pt-2 border-t">
            <UButton icon="i-lucide-plus" variant="soft" :disabled="!filterableColumns.length" @click="emit('add')">
              Agregar filtro
            </UButton>
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>
