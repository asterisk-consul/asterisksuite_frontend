<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  buildProductCategoryFilterOptions,
  buildProductTagFilterOptions,
  type ProductCategoryTaxonomy,
  type ProductTagTaxonomy,
} from './product-taxonomy.utils'

const props = withDefaults(defineProps<{
  categories?: ProductCategoryTaxonomy[]
  tags?: ProductTagTaxonomy[]
  categoryIds?: string[]
  tagIds?: string[]
  multiple?: boolean
  showCategories?: boolean
  showTags?: boolean
  categoryLabel?: string
  tagLabel?: string
}>(), {
  categories: () => [],
  tags: () => [],
  categoryIds: () => [],
  tagIds: () => [],
  multiple: false,
  showCategories: true,
  showTags: true,
  categoryLabel: 'Categoría',
  tagLabel: 'Etiqueta',
})

const emit = defineEmits<{
  'update:categoryIds': [value: string[]]
  'update:tagIds': [value: string[]]
}>()

const categorySearch = ref('')
const categoryPopoverOpen = ref(false)
const categoryOptions = computed(() => buildProductCategoryFilterOptions(props.categories))
const tagOptions = computed(() => buildProductTagFilterOptions(props.tags))
const selectedCategoryOption = computed(() => categoryOptions.value.find(option => option.value === props.categoryIds[0]))
const filteredCategoryOptions = computed(() => {
  const term = categorySearch.value.trim().toLocaleLowerCase('es-AR')
  if (!term) return categoryOptions.value
  return categoryOptions.value.filter(option => `${option.label} ${option.path}`.toLocaleLowerCase('es-AR').includes(term))
})
const selectedCategoriesLabel = computed(() => {
  if (!props.categoryIds.length) return 'Todas las categorías'
  if (props.categoryIds.length === 1) return selectedCategoryOption.value?.label ?? '1 categoría'
  return `${props.categoryIds.length} categorías`
})
const hasCategoryFilter = computed(() => props.showCategories && categoryOptions.value.length > 0)
const hasTagFilter = computed(() => props.showTags && tagOptions.value.length > 0)
const hasActiveFilters = computed(() => props.categoryIds.length > 0 || props.tagIds.length > 0)
const tagSelectItems = computed(() => props.multiple
  ? tagOptions.value
  : [{ label: 'Todas las etiquetas', value: '' }, ...tagOptions.value])

function selectCategory(value: string) {
  if (!props.multiple) {
    emit('update:categoryIds', value ? [value] : [])
    categorySearch.value = ''
    categoryPopoverOpen.value = false
    return
  }

  const selected = new Set(props.categoryIds)
  if (selected.has(value)) selected.delete(value)
  else selected.add(value)
  emit('update:categoryIds', [...selected])
}

function updateTags(value: unknown) {
  const values = (Array.isArray(value) ? value : value == null || value === '' ? [] : [value])
    .filter((item): item is string => typeof item === 'string' && item.length > 0)
  emit('update:tagIds', props.multiple ? values : values.slice(0, 1))
}

function clearFilters() {
  emit('update:categoryIds', [])
  emit('update:tagIds', [])
  categorySearch.value = ''
}
</script>

<template>
  <div v-if="hasCategoryFilter || hasTagFilter" class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
    <UFormField v-if="hasCategoryFilter" :label="categoryLabel" class="min-w-0">
      <UPopover v-model:open="categoryPopoverOpen">
        <UButton
          color="neutral"
          variant="outline"
          trailing-icon="i-lucide-chevron-down"
          class="w-full justify-between"
          :title="selectedCategoryOption?.path ?? 'Todas las categorías'"
          :aria-label="`Filtrar por ${categoryLabel.toLocaleLowerCase('es-AR')}`"
        >
          <span class="flex min-w-0 items-center gap-2">
            <UIcon name="i-lucide-folder-tree" class="size-4 shrink-0 text-primary" />
            <span class="truncate">{{ selectedCategoriesLabel }}</span>
          </span>
        </UButton>
        <template #content>
          <div class="w-[min(92vw,26rem)] p-2">
            <UInput v-model="categorySearch" icon="i-lucide-search" placeholder="Buscar categoría o subcategoría..." autofocus class="mb-2 w-full" />
            <div class="max-h-80 space-y-1 overflow-y-auto pr-1">
              <button
                v-if="!multiple"
                type="button"
                class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-elevated"
                :class="!categoryIds.length ? 'bg-primary/10 text-primary' : 'text-default'"
                @click="selectCategory('')"
              >
                <UIcon name="i-lucide-layers-2" class="size-4 shrink-0" />
                <span class="font-medium">Todas las categorías</span>
                <UIcon v-if="!categoryIds.length" name="i-lucide-check" class="ml-auto size-4" />
              </button>
              <button
                v-for="category in filteredCategoryOptions"
                :key="category.value"
                type="button"
                class="flex w-full min-w-0 items-center gap-2 rounded-lg py-2 pr-2 text-left transition-colors hover:bg-elevated"
                :class="categoryIds.includes(category.value) ? 'bg-primary/10 text-primary' : 'text-default'"
                :style="{ paddingLeft: `${8 + Math.min(category.depth, 6) * 12}px` }"
                :title="category.path"
                @click="selectCategory(category.value)"
              >
                <UIcon :name="category.depth ? 'i-lucide-corner-down-right' : 'i-lucide-folder'" class="size-4 shrink-0 text-muted" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium">{{ category.label }}</span>
                  <span v-if="category.parentPath" class="block truncate text-xs text-muted">{{ category.parentPath }}</span>
                </span>
                <UIcon v-if="categoryIds.includes(category.value)" name="i-lucide-check" class="ml-auto size-4 shrink-0" />
              </button>
              <p v-if="!filteredCategoryOptions.length" class="px-3 py-6 text-center text-sm text-muted">No hay categorías que coincidan.</p>
            </div>
            <div v-if="multiple && categoryIds.length" class="mt-2 flex justify-end border-t border-default pt-2">
              <UButton label="Limpiar categorías" size="xs" color="neutral" variant="link" @click="emit('update:categoryIds', [])" />
            </div>
          </div>
        </template>
      </UPopover>
    </UFormField>

    <UFormField v-if="hasTagFilter" :label="tagLabel" class="min-w-0">
      <USelectMenu
        :model-value="multiple ? tagIds : (tagIds[0] ?? '')"
        :items="tagSelectItems"
        value-key="value"
        :multiple="multiple"
        searchable
        placeholder="Todas las etiquetas"
        class="w-full min-w-0"
        :aria-label="`Filtrar por ${tagLabel.toLocaleLowerCase('es-AR')}`"
        @update:model-value="updateTags"
      />
    </UFormField>

    <div v-if="multiple && hasActiveFilters" class="-mt-1 flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
      <p class="text-xs text-muted">Coincide con al menos una opción de cada filtro activo.</p>
      <UButton label="Limpiar filtros" size="xs" color="neutral" variant="link" class="px-0" @click="clearFilters" />
    </div>
  </div>
</template>
