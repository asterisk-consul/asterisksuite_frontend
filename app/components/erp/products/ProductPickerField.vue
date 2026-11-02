<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

interface ProductOption {
  value?: string
  label?: string
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
  appearance: 'card'
})

const emit = defineEmits<{
  add: []
}>()

const selectedProduct = defineModel<any>({ default: null })
const searchTerm = defineModel<string>('searchTerm', { default: '' })
const pickerOpen = ref(false)
const pickerRoot = ref<HTMLElement | null>(null)

function getOptionValue(option: ProductOption | null | undefined) {
  if (!option) return undefined
  return props.valueKey ? option[props.valueKey] : option.value
}

const visibleItems = computed(() => {
  const term = searchTerm.value.trim().toLocaleLowerCase('es-AR')
  const matches = props.filterLocally && term
    ? props.items.filter(option => String(option[props.labelKey] ?? '').toLocaleLowerCase('es-AR').includes(term))
    : props.items

  const selectedValue = typeof selectedProduct.value === 'object'
    ? getOptionValue(selectedProduct.value)
    : selectedProduct.value
  const selectedOption = props.items.find(option => getOptionValue(option) === selectedValue)
    ?? (typeof selectedProduct.value === 'object' ? selectedProduct.value as ProductOption : undefined)
  const options = selectedOption && !matches.some(option => getOptionValue(option) === selectedValue)
    ? [selectedOption, ...matches]
    : matches

  return options.slice(0, props.maxOptions)
})

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

    <div
      class="grid grid-cols-1 gap-3 lg:items-end"
      :class="hasDetails && $slots.details
        ? 'lg:grid-cols-[minmax(0,1fr)_minmax(14rem,0.55fr)_auto]'
        : 'lg:grid-cols-[minmax(0,1fr)_auto]'"
    >
      <UFormField :label="fieldLabel" :description="fieldDescription" class="min-w-0">
        <div ref="pickerRoot">
          <USelectMenu
            v-model:open="pickerOpen"
            v-model="selectedProduct"
            v-model:search-term="searchTerm"
            :items="visibleItems"
            :value-key="valueKey"
            :label-key="labelKey"
            :placeholder="placeholder"
            :loading="loading"
            :disabled="disabled"
            searchable
            size="lg"
            class="w-full min-w-0"
          />
        </div>
      </UFormField>

      <slot name="details" />

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

    <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span class="inline-flex items-center gap-1.5"><KeyboardShortcutHint :keys="['F2']" /> abre el selector</span>
      <span class="inline-flex items-center gap-1.5"><KeyboardShortcutHint :keys="['Tab']" /> recorre los campos</span>
    </div>
  </div>
</template>
