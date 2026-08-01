<script setup lang="ts">
import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'
import type { ProductCostSource } from '~/modulos/logistica/master-data/product/types/product.types'

import { ProductCostSourceOptions } from '~/modulos/logistica/master-data/product/utils/product-options.utils'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'

const { init, selectItems } = useCurrencies()
const props = withDefaults(
  defineProps<{
    form: ProductFormState
    excludeSources?: ProductCostSource[]
    modelValue?: string
  }>(),
  {
    excludeSources: () => [],
    modelValue: ''
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const filteredCostSourceOptions = computed(() =>
  ProductCostSourceOptions.filter((opt) => !props.excludeSources.includes(opt.value))
)

const selectedCurrency = computed({
  get: () => selectItems.value.find((i) => i.value === props.modelValue),
  set: (option) => {
    emit('update:modelValue', option?.value ?? '')
  }
})

const costSourceDescriptions: Record<string, { label: string; description: string; icon: string }> = {
  BOM: {
    label: 'BOM',
    description: 'Calcula desde la estructura de componentes. Ideal para productos terminados con materiales.',
    icon: 'i-lucide-package'
  },
  ENGINEERING: {
    label: 'Ingeniería',
    description: 'Calcula desde dimensiones físicas (largo × ancho × alto × densidad).',
    icon: 'i-lucide-ruler'
  },
  PURCHASE: {
    label: 'Compra',
    description: 'Usa el costo de compra del proveedor. Para productos comprados que se revenden.',
    icon: 'i-lucide-shopping-cart'
  },
  RATE: {
    label: 'Tasa',
    description: 'Usa una tarifa o transporte configurado. Para servicios.',
    icon: 'i-lucide-truck'
  },
  MANUAL: {
    label: 'Manual',
    description: 'El usuario ingresa el costo total directamente.',
    icon: 'i-lucide-pencil'
  }
}

onMounted(() => init())
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
    <UFormField label="Fuente de costo" required>
      <div class="flex items-center gap-1.5">
        <USelect v-model="form.cost_source" :items="filteredCostSourceOptions" class="flex-1" />
        <UPopover>
          <UIcon name="i-lucide-help-circle" class="h-5 w-5 text-muted shrink-0 cursor-help hover:text-default transition-colors" />
          <template #content>
            <div class="p-4 max-w-xs space-y-3">
              <p class="text-xs font-semibold text-muted uppercase tracking-wide">Tipos de costo</p>
              <div class="space-y-3">
                <div
                  v-for="(info, type) in costSourceDescriptions"
                  :key="type"
                  class="flex gap-3"
                >
                  <div class="size-7 rounded-md bg-elevated flex items-center justify-center shrink-0 mt-0.5">
                    <UIcon :name="info.icon" class="size-3.5 text-muted" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-default">{{ info.label }}</p>
                    <p class="text-xs text-muted leading-relaxed">{{ info.description }}</p>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </UPopover>
      </div>
    </UFormField>
    <UFormField label="Moneda" required>
      <USelectMenu
        v-model="selectedCurrency"
        :items="selectItems"
        placeholder="Seleccionar moneda"
        searchable
        class="w-full"
      />
    </UFormField>
  </div>
</template>
