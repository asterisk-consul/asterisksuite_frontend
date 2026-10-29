<script setup lang="ts">
import { useId } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
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

type ColumnVisibilityItem = {
  id: string
  label: string
  checked: boolean
  onUpdateChecked: (checked: boolean) => void
}

const props = defineProps<{
  table: any // ✅ ref del UTable (template ref)
  columns: any[] // ✅ columnas para el popover de filtros
  filterFields?: FilterField[]
  sortFields?: SortField[]
  serverSide?: boolean
  searchPlaceholder?: string
  columnVisibilityItems?: ColumnVisibilityItem[]
}>()

const emit = defineEmits<{
  resetColumns: []
  reorderColumns: [columnIds: string[]]
}>()

// --- Models ---
const sorting = defineModel<SortingState>('sorting', { default: () => [] })
const search = defineModel<string>('search', { default: '' })
const serverFilters = defineModel<TableFilter[]>('filters', { default: () => [] })
const filtersOpen = ref(false)
const toolbarId = useId()
const activeFiltersToolbarId = useState<string | null>('table-filters-active-toolbar', () => null)
const mountedFiltersToolbarIds = useState<string[]>('table-filters-toolbar-ids', () => [])

function activateFiltersToolbar() {
  activeFiltersToolbarId.value = toolbarId
}

function isEditingText(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.closest('[data-table-search]')) return false
  return target.isContentEditable || Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"], [role="combobox"]'))
}

function handleFiltersShortcut(event: KeyboardEvent) {
  if (
    event.defaultPrevented
    || event.isComposing
    || event.repeat
    || !event.ctrlKey
    || !event.shiftKey
    || event.altKey
    || event.metaKey
    || event.key.toLowerCase() !== 'f'
    || isEditingText(event.target)
    || activeFiltersToolbarId.value !== toolbarId
  ) return

  event.preventDefault()
  event.stopPropagation()
  filtersOpen.value = !filtersOpen.value
}

onMounted(() => {
  if (!mountedFiltersToolbarIds.value.includes(toolbarId)) mountedFiltersToolbarIds.value.push(toolbarId)
  if (!activeFiltersToolbarId.value || !mountedFiltersToolbarIds.value.includes(activeFiltersToolbarId.value)) {
    activeFiltersToolbarId.value = toolbarId
  }
  window.addEventListener('keydown', handleFiltersShortcut)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleFiltersShortcut)
  mountedFiltersToolbarIds.value = mountedFiltersToolbarIds.value.filter(id => id !== toolbarId)
  if (activeFiltersToolbarId.value === toolbarId) {
    activeFiltersToolbarId.value = mountedFiltersToolbarIds.value[0] ?? null
  }
})

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

const orderedColumnItems = computed({
  get: () => props.columnVisibilityItems ?? [],
  set: (items: ColumnVisibilityItem[]) => emit('reorderColumns', items.map(item => item.id))
})

function moveColumn(index: number, direction: -1 | 1) {
  const items = [...orderedColumnItems.value]
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= items.length) return

  const [movedItem] = items.splice(index, 1)
  if (!movedItem) return
  items.splice(targetIndex, 0, movedItem)
  emit('reorderColumns', items.map(item => item.id))
}
</script>

<template>
  <div
    class="min-w-0 max-w-full border-b border-default"
    :data-table-toolbar="toolbarId"
    @focusin="activateFiltersToolbar"
    @pointerdown="activateFiltersToolbar"
  >
    <!-- Toolbar -->
    <div class="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3">
      <!-- Inputs rápidos -->
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <UInput
          v-if="serverSide"
          v-model="search"
          data-table-search
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
          data-table-search
          :placeholder="field.label"
          :icon="field.icon ?? 'i-lucide-search'"
          :class="field.class ?? 'w-44'"
          size="sm"
          variant="outline"
          clearable
        />
      </div>

      <!-- Acciones -->
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <UPopover v-if="columnVisibilityItems?.length">
          <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-columns-3" label="Columnas" />
          <template #content>
            <div class="w-64 p-3">
              <div class="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p class="text-sm font-medium">Columnas visibles</p>
                  <p class="text-xs text-muted">Elegí cuáles ver y cambiá su orden.</p>
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
              <VueDraggable
                v-model="orderedColumnItems"
                handle=".column-order-handle"
                direction="vertical"
                :animation="160"
                :delay="120"
                delay-on-touch-only
                :touch-start-threshold="4"
                ghost-class="opacity-40"
                class="max-h-72 space-y-1 overflow-y-auto"
              >
                <div
                  v-for="(item, index) in orderedColumnItems"
                  :key="item.id"
                  class="flex min-w-0 items-center gap-1 rounded-md px-1 py-1.5 text-sm hover:bg-elevated"
                >
                  <span
                    class="column-order-handle flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded text-dimmed hover:bg-muted hover:text-highlighted active:cursor-grabbing"
                    :title="`Arrastrar ${item.label} para cambiar el orden`"
                    aria-hidden="true"
                  >
                    <UIcon name="i-lucide-grip-vertical" class="size-4" />
                  </span>
                  <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                    <UCheckbox :model-value="item.checked" @update:model-value="item.onUpdateChecked(Boolean($event))" />
                    <span class="min-w-0 truncate">{{ item.label }}</span>
                  </label>
                  <span class="flex shrink-0 items-center">
                    <UButton
                      icon="i-lucide-chevron-up"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      :disabled="index === 0"
                      :aria-label="`Mover ${item.label} hacia arriba`"
                      @click="moveColumn(index, -1)"
                    />
                    <UButton
                      icon="i-lucide-chevron-down"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      :disabled="index === orderedColumnItems.length - 1"
                      :aria-label="`Mover ${item.label} hacia abajo`"
                      @click="moveColumn(index, 1)"
                    />
                  </span>
                </div>
              </VueDraggable>
            </div>
          </template>
        </UPopover>
        <!-- Chip filtros -->

        <!-- Popover -->
        <TableFiltersPopover
          v-model:open="filtersOpen"
          :filters="filters"
          :columns="columns"
          @add="addFilter"
          @clear="clearFilters"
          @update="updateFilter"
          @remove="removeFilter"
        />

        <!-- Limpiar -->
        <UButton
          v-if="hasActiveFilters"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Limpiar búsqueda, filtros y ordenamiento"
          title="Limpiar búsqueda, filtros y ordenamiento"
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
