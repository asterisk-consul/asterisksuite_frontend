<script setup lang="ts">
import type { SortingState } from '@tanstack/vue-table'
import { useTableFilters } from '~/components/Tablas/composable/useTableFilters'

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
}>()

// --- Models ---
const sorting = defineModel<SortingState>('sorting', { default: () => [] })

// --- Filtros dinámicos (popover) ---
const tableRef = computed(() => props.table)
const columnsRef = computed(() => props.columns)

const { filters, addFilter, removeFilter, clearFilters } = useTableFilters(tableRef, columnsRef)

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
  selectedSortField.value = undefined
  sortDesc.value = false
  clearFilters()
}

const hasActiveFilters = computed(
  () =>
    Object.values(filterValues.value).some((v) => v?.trim()) || !!selectedSortField.value || filters.value.length > 0
)
</script>

<template>
  <div class="border-b border-default">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <!-- Inputs rápidos -->
      <div class="flex flex-wrap items-center gap-2">
        <UInput
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
        <!-- Chip filtros -->

        <!-- Popover -->
        <TableFiltersPopover :filters="filters" :columns="columns" @add="addFilter" @remove="removeFilter" />

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
