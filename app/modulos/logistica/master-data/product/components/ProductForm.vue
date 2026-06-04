<script setup lang="ts">
import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'

import ProductGeneralTab from '~/modulos/logistica/master-data/product/components/form/ProductGeneralTab.vue'
import ProductInventoryTab from '~/modulos/logistica/master-data/product/components/form/ProductInventoryTab.vue'
import ProductAccountingTab from '~/modulos/logistica/master-data/product/components/form/ProductAccountingTab.vue'
import ProductAdvancedTab from '~/modulos/logistica/master-data/product/components/form/ProductAdvancedTab.vue'
import RootCard from '~/modulos/logistica/master-data/product/components/form/RootCard.vue'
import ProductPriceTab from '~/modulos/logistica/master-data/product/components/form/ProductPriceTab.vue'
import ProductVariantTable from '~/modulos/logistica/master-data/product-variants/components/ProductVariantTable.vue'

import type { Product } from '~/modulos/logistica/master-data/product/types/product.types'

type Mode = 'create' | 'edit'

const form = defineModel<ProductFormState>({
  required: true
})

const props = withDefaults(
  defineProps<{
    loading?: boolean
    mode?: Mode
    product?: Product | null
    showActions?: boolean
    submitLabel?: string
  }>(),
  {
    mode: 'create',
    showActions: true,
    product: null
  }
)

const emit = defineEmits<{
  submit: []
}>()

const submitText = computed(() => {
  if (props.submitLabel) return props.submitLabel

  return props.mode === 'edit' ? 'Guardar cambios' : 'Crear producto'
})

const form = [
  { label: 'Variables', slot: 'variables', icon: 'i-lucide-settings-2' },
  {
    label: 'Productos relacionados',
    slot: 'relaciones',
    icon: 'i-lucide-link-2'
  },
  { label: 'Precios', slot: 'precios', icon: 'i-lucide-wallet' },
  {
    label: 'Inventario',
    slot: 'inventory',
    icon: 'i-lucide-box'
  },
  {
    label: 'Contabilidad',
    slot: 'accounting',
    icon: 'i-lucide-landmark'
  },
  {
    label: 'Avanzado',
    slot: 'advanced',
    icon: 'i-lucide-settings-2'
  }
]
</script>

<template>
  <UForm :state="form" class="space-y-6 pb-6" @submit.prevent="emit('submit')">
    <!-- ========================= -->
    <!-- HEADER -->
    <!-- ========================= -->

    <ProductGeneralTab v-model="form" />

    <!-- ========================= -->
    <!-- form -->
    <!-- ========================= -->

    <Uform :items="form" variant="link" class="w-full">
      <template #accounting>
        <ProductAccountingTab v-model="form" />
      </template>

      <template #variables>
        <ProductVariantTable :product="props.product" />
      </template>

      <template #relaciones>
        <RootCard :product="props.product" />
      </template>

      <template #precios>
        <ProductPriceTab :product="props.product" />
      </template>

      <template #inventory>
        <ProductInventoryTab v-model="form" />
      </template>

      <template #advanced>
        <ProductAdvancedTab v-model="form" />
      </template>
    </Uform>

    <!-- ========================= -->
    <!-- ACTIONS -->
    <!-- ========================= -->

    <div v-if="showActions" class="flex justify-end">
      <UButton type="submit" :loading="loading">
        {{ submitText }}
      </UButton>
    </div>
  </UForm>
</template>
