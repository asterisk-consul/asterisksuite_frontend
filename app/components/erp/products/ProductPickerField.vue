<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

interface ProductOption {
  value?: string
  label?: string
  categories?: { id: string, name: string }[]
  tags?: { id: string, name: string }[]
  [key: string]: any
}

const props = withDefaults(defineProps<{
  items: ProductOption[]
  valueKey?: string
  labelKey?: string
  title?: string
  description?: string
  fieldLabel?: string
  fieldDescription?: string
  placeholder?: string
  addLabel?: string
  loading?: boolean
  disabled?: boolean
  addDisabled?: boolean
  active?: boolean
  filterLocally?: boolean
  hasDetails?: boolean
  maxOptions?: number
  appearance?: 'card' | 'inline'
  multiple?: boolean
  showTaxonomyFilters?: boolean
}>(), {
  labelKey: 'label',
  fieldLabel: 'Producto',
  placeholder: 'Buscar por código o nombre...',
  addLabel: 'Agregar producto',
  loading: false,
  disabled: false,
  addDisabled: false,
  active: true,
  filterLocally: true,
  hasDetails: false,
  maxOptions: 100,
  appearance: 'card',
  multiple: false,
  showTaxonomyFilters: false
})

const emit = defineEmits<{
  add: []
}>()

const selectedProduct = defineModel<any>({ default: null })
const searchTerm = defineModel<string>('searchTerm', { default: '' })
const pickerOpen = ref(false)
const pickerRoot = ref<HTMLElement | null>(null)
const selectedCategoryIds = ref<string[]>([])
const selectedTagIds = ref<string[]>([])

function getOptionValue(option: ProductOption | null | undefined) {
  if (!option) return undefined
  return props.valueKey ? option[props.valueKey] : option.value
}

const selectedValues = computed(() => {
  const value = selectedProduct.value
  const values = props.multiple
    ? Array.isArray(value) ? value : value == null || value === '' ? [] : [value]
    : [typeof value === 'object' ? getOptionValue(value) : value]
  return values
    .map(item => typeof item === 'object' ? getOptionValue(item as ProductOption) : item)
    .filter((item): item is string => typeof item === 'string' && item.length > 0)
})

function taxonomyOptions(key: 'categories' | 'tags') {
  const options = new Map<string, { label: string, value: string }>()
  for (const product of props.items) {
    for (const taxonomy of product[key] ?? []) {
      if (!taxonomy?.id || !taxonomy?.name) continue
      options.set(taxonomy.id, { label: taxonomy.name, value: taxonomy.id })
    }
  }
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label, 'es-AR'))
}

const categoryOptions = computed(() => taxonomyOptions('categories'))
const tagOptions = computed(() => taxonomyOptions('tags'))

const visibleItems = computed(() => {
  const term = searchTerm.value.trim().toLocaleLowerCase('es-AR')
  const selectedCategories = new Set(selectedCategoryIds.value)
  const selectedTags = new Set(selectedTagIds.value)
  const matches = props.items.filter((option) => {
    if (props.filterLocally && term && !String(option[props.labelKey] ?? '').toLocaleLowerCase('es-AR').includes(term)) return false
    if (selectedCategories.size && !(option.categories ?? []).some(category => selectedCategories.has(category.id))) return false
    if (selectedTags.size && !(option.tags ?? []).some(tag => selectedTags.has(tag.id))) return false
    return true
  })
  const matchingValues = new Set(matches.map(option => String(getOptionValue(option) ?? '')))
  const selectedOptions = props.items
    .filter(option => selectedValues.value.includes(String(getOptionValue(option) ?? '')))
    .map((option) => {
      const value = String(getOptionValue(option) ?? '')
      if (matchingValues.has(value)) return option
      return {
        ...option,
        [props.labelKey]: `${String(option[props.labelKey] ?? '')} · ya seleccionado`
      }
    })
  const unselectedMatches = matches.filter(option => !selectedValues.value.includes(String(getOptionValue(option) ?? '')))

  return [...selectedOptions, ...unselectedMatches.slice(0, props.maxOptions)]
})

const hasTaxonomyFilters = computed(() => props.showTaxonomyFilters
  && (categoryOptions.value.length > 0 || tagOptions.value.length > 0))
const hasActiveTaxonomyFilters = computed(() => selectedCategoryIds.value.length > 0 || selectedTagIds.value.length > 0)

function clearTaxonomyFilters() {
  selectedCategoryIds.value = []
  selectedTagIds.value = []
}

function focusPicker() {
  if (!props.active || props.disabled) return
  pickerOpen.value = true
  void nextTick(() => {
    const trigger = pickerRoot.value?.querySelector<HTMLElement>('button, [role="combobox"]')
    trigger?.scrollIntoView({ block: 'nearest' })
    trigger?.focus()
    void nextTick(() => {
      document.querySelector<HTMLInputElement>(
        '[cmdk-input], input[role="combobox"], input[aria-autocomplete="list"]'
      )?.focus()
    })
  })
}

function requestAdd() {
  if (!props.active || props.disabled || props.addDisabled) return
  emit('add')
  void nextTick(focusPicker)
}

function handleProductShortcut(event: KeyboardEvent) {
  if (!props.active || event.defaultPrevented || event.isComposing) return

  if (event.key === 'F2' && !event.altKey && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    focusPicker()
    return
  }

  if (event.key === 'Enter' && event.ctrlKey && !event.altKey && !event.metaKey) {
    event.preventDefault()
    event.stopPropagation()
    requestAdd()
  }
}

onMounted(() => window.addEventListener('keydown', handleProductShortcut, true))
onBeforeUnmount(() => window.removeEventListener('keydown', handleProductShortcut, true))
</script>

<template>
  <div
    :class="appearance === 'card'
      ? 'rounded-xl border border-default bg-muted/30 p-4'
      : 'rounded-lg bg-muted/30 p-3'"
  >
    <div v-if="title || description" class="mb-4 flex items-start gap-3">
      <div v-if="appearance === 'card'" class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <UIcon name="i-lucide-package-plus" class="size-5" />
      </div>
      <div>
        <p v-if="title" class="font-medium">{{ title }}</p>
        <p v-if="description" class="text-sm text-muted">{{ description }}</p>
      </div>
    </div>

    <div v-if="hasTaxonomyFilters" class="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
      <UFormField v-if="categoryOptions.length" label="Categoría" class="min-w-0">
        <USelectMenu
          v-model="selectedCategoryIds"
          :items="categoryOptions"
          value-key="value"
          placeholder="Todas las categorías"
          searchable
          multiple
          class="w-full min-w-0"
        />
      </UFormField>
      <UFormField v-if="tagOptions.length" label="Etiqueta" class="min-w-0">
        <USelectMenu
          v-model="selectedTagIds"
          :items="tagOptions"
          value-key="value"
          placeholder="Todas las etiquetas"
          searchable
          multiple
          class="w-full min-w-0"
        />
      </UFormField>
    </div>
    <p v-if="hasActiveTaxonomyFilters" class="-mt-2 mb-3 text-xs text-muted">
      Se combina al menos una opción de cada filtro activo.
    </p>

    <div
      class="grid grid-cols-1 gap-3 lg:items-end"
      :class="hasDetails && $slots.details && !multiple
        ? 'lg:grid-cols-[minmax(0,1fr)_minmax(14rem,0.55fr)_auto]'
        : 'lg:grid-cols-[minmax(0,1fr)_auto]'"
    >
      <UFormField :label="fieldLabel" :description="fieldDescription" class="min-w-0">
        <div ref="pickerRoot" data-product-selector>
          <USelectMenu
            v-model:open="pickerOpen"
            v-model="selectedProduct"
            v-model:search-term="searchTerm"
            :items="visibleItems"
            :value-key="valueKey"
            :label-key="labelKey"
            :multiple="multiple"
            :placeholder="placeholder"
            :loading="loading"
            :disabled="disabled"
            searchable
            size="lg"
            class="w-full min-w-0"
          />
        </div>
      </UFormField>

      <slot v-if="hasDetails && !multiple" name="details" />

      <UButton
        icon="i-lucide-plus"
        :label="addLabel"
        size="lg"
        class="w-full justify-center lg:w-auto"
        :disabled="disabled || addDisabled"
        @click="requestAdd"
      >
        <template #trailing>
          <KeyboardShortcutHint :keys="['Ctrl', '↵']" />
        </template>
      </UButton>
    </div>

    <slot v-if="hasDetails && multiple" name="details" />

    <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span class="inline-flex items-center gap-1.5"><KeyboardShortcutHint :keys="['F2']" /> abre el selector</span>
      <span class="inline-flex items-center gap-1.5"><KeyboardShortcutHint :keys="['Tab']" /> recorre los campos</span>
      <span v-if="multiple && selectedValues.length" class="font-medium text-primary">{{ selectedValues.length }} producto(s) seleccionado(s) · se agrega cada uno con cantidad 1</span>
      <UButton
        v-if="hasActiveTaxonomyFilters"
        label="Limpiar filtros"
        size="xs"
        color="neutral"
        variant="link"
        class="px-0"
        @click="clearTaxonomyFilters"
      />
    </div>
  </div>
</template>
