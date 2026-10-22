<script setup lang="ts">
import type { SortingState } from '@tanstack/vue-table'
import { useTableFilters } from '~/components/Tablas/composable/useTableFilters'
import type { TableFilter } from '~/components/Tablas/types/tablas.types'

import TableFiltersPopover from '~/components/Tablas/filters/TableFiltersPopover.vue'

export interface FilterField {
  id: string
  label: string
  icon?: string
  class?: string
}

export interface SortField {
  label: string
  value: string
}

const props = defineProps<{
  table: any // ✅ ref del UTable (template ref)
  columns: any[] // ✅ columnas para el popover de filtros
  filterFields?: FilterField[]
  sortFields?: SortField[]
  serverSide?: boolean
  searchPlaceholder?: string
  columnVisibilityItems?: Array<{ label: string; checked: boolean; onUpdateChecked: (checked: boolean) => void }>
}>()

const emit = defineEmits<{ resetColumns: [] }>()

// --- Models ---
const sorting = defineModel<SortingState>('sorting', { default: () => [] })
const search = defineModel<string>('search', { default: '' })
const serverFilters = defineModel<TableFilter[]>('filters', { default: () => [] })

// --- Filtros dinámicos (popover) ---
const tableRef = computed(() => props.table)
const columnsRef = computed(() => props.columns)

const { filters, addFilter, updateFilter, removeFilter, clearFilters } = useTableFilters(tableRef, columnsRef, {
  filters: serverFilters,
  applyLocally: !props.serverSide
})

// --- Filtros simples (inputs) ---
const filterValues = ref<Record<string, string>>({})

// Los inputs simples usan columnFilters normales via tableApi directamente
watch(
  filterValues,
  (vals) => {
    const api = props.table?.tableApi
    if (!api) return

    props.filterFields?.forEach(({ id }) => {
      api.getColumn(id)?.setFilterValue(undefined)
    })

    Object.entries(vals)
      .filter(([, v]) => v?.trim())
      .forEach(([id, value]) => {
        api.getColumn(id)?.setFilterValue({
          operator: 'contains', // ✅
          value
        })
      })
  },
  { deep: true }
)

// --- Ordenamiento ---
const selectedSortField = ref<string | undefined>(undefined)
const sortDesc = ref(false)

// Agregar este watch después de declarar selectedSortField y sortDesc
watch(
  sorting,
  (val) => {
    const first = val[0] // ✅ extraer primero

    if (first) {
      selectedSortField.value = first.id
      sortDesc.value = first.desc
    } else {
      selectedSortField.value = undefined
      sortDesc.value = false
    }
  },
  { immediate: true, deep: true }
)

watch([selectedSortField, sortDesc], () => {
  sorting.value = selectedSortField.value ? [{ id: selectedSortField.value, desc: sortDesc.value }] : []
})

function toggleDirection() {
  sortDesc.value = !sortDesc.value
}

// --- Limpiar todo ---
function clearAll() {
  filterValues.value = {}
  search.value = ''
  selectedSortField.value = undefined
  sortDesc.value = false
  clearFilters()
}

const hasActiveFilters = computed(
  () =>
    search.value.trim() || Object.values(filterValues.value).some((v) => v?.trim()) || !!selectedSortField.value || filters.value.length > 0
)
</script>

<template>
  <div class="border-b border-default">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <!-- Inputs rápidos -->
      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-if="serverSide"
          v-model="search"
          :placeholder="searchPlaceholder || 'Buscar por N°, tercero o descripción...'"
          icon="i-lucide-search"
          class="w-72 max-w-full"
          size="sm"
          variant="outline"
          clearable
        />
        <UInput
          v-else
          v-for="field in filterFields"
          :key="field.id"
          v-model="filterValues[field.id]"
          :placeholder="field.label"
          :icon="field.icon ?? 'i-lucide-search'"
          :class="field.class ?? 'w-44'"
          size="sm"
          variant="outline"
          clearable
        />
      </div>

      <!-- Acciones -->
      <div class="flex items-center gap-2">
        <UPopover v-if="columnVisibilityItems?.length">
          <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-columns-3" label="Columnas" />
          <template #content>
            <div class="w-64 p-3">
              <div class="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p class="text-sm font-medium">Columnas visibles</p>
                  <p class="text-xs text-muted">Elegí qué información mostrar.</p>
                </div>
                <UButton
                  icon="i-lucide-rotate-ccw"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  aria-label="Restablecer columnas"
                  title="Restablecer"
                  @click="emit('resetColumns')"
                />
              </div>
              <div class="max-h-72 space-y-1 overflow-y-auto">
                <label
                  v-for="item in columnVisibilityItems"
                  :key="item.label"
                  class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-elevated"
                >
                  <UCheckbox :model-value="item.checked" @update:model-value="item.onUpdateChecked(Boolean($event))" />
                  <span class="truncate">{{ item.label }}</span>
                </label>
              </div>
            </div>
          </template>
        </UPopover>
        <!-- Chip filtros -->

        <!-- Popover -->
        <TableFiltersPopover :filters="filters" :columns="columns" @add="addFilter" @update="updateFilter" @remove="removeFilter" />

        <!-- Limpiar -->
        <UButton
          v-if="hasActiveFilters"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="clearAll"
        />

        <!-- Ordenamiento -->
        <UFieldGroup v-if="sortFields?.length">
          <UButton
            :icon="sortDesc ? 'i-lucide-arrow-down' : 'i-lucide-arrow-up'"
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="!selectedSortField"
            @click="toggleDirection"
          />

          <USelectMenu
            v-model="selectedSortField"
            :items="sortFields"
            value-key="value"
            label-key="label"
            placeholder="Ordenar por..."
            class="w-52"
            size="sm"
          />
        </UFieldGroup>
      </div>
    </div>
  </div>
</template>
