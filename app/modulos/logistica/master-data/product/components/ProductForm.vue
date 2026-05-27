<script setup lang="ts">
import type { CreateProductDto } from '~/modulos/logistica/master-data/product/types/product.types'

import ProductGeneralTab from '~/modulos/logistica/master-data/product/components/tabs/ProductGeneralTab.vue'
import ProductInventoryTab from '~/modulos/logistica/master-data/product/components/tabs/ProductInventoryTab.vue'
import ProductAccountingTab from '~/modulos/logistica/master-data/product/components/tabs/ProductAccountingTab.vue'
import ProductAdvancedTab from '~/modulos/logistica/master-data/product/components/tabs/ProductAdvancedTab.vue'
import RootCard from '~/modulos/logistica/master-data/product/components/tabs/RootCard.vue'
import ProductPriceTab from '~/modulos/logistica/master-data/product/components/tabs/ProductPriceTab.vue'

import type { Product } from '~/modulos/logistica/master-data/product/types/product.types'

type Mode = 'create' | 'edit'

const form = defineModel<CreateProductDto>({
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

const tabs = [
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
    <!-- TABS -->
    <!-- ========================= -->

    <UTabs :items="tabs" variant="link" class="w-full">
      <template #relaciones>
        <RootCard :product="props.product" />
      </template>

      <template #precios>
        <ProductPriceTab :product="props.product" />
      </template>

      <template #inventory>
        <ProductInventoryTab v-model="form" />
      </template>

      <template #accounting>
        <ProductAccountingTab v-model="form" />
      </template>

      <template #advanced>
        <ProductAdvancedTab v-model="form" />
      </template>
    </UTabs>

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
