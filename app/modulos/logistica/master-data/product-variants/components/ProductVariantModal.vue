<script setup lang="ts">
import type {
  ProductVariant,
  CreateProductVariantInput
} from '~/modulos/logistica/master-data/product-variants/types/product-variants.types'

import ProductVariantForm from '~/modulos/logistica/master-data/product-variants/components/ProductVariantForm.vue'

const open = defineModel<boolean>('open', {
  default: false
})

const props = defineProps<{
  productId: string

  variant?: ProductVariant | null

  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: CreateProductVariantInput]
}>()

const onSubmit = (payload: CreateProductVariantInput) => {
  emit('submit', payload)
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">
              {{ variant ? 'Editar variante' : 'Nueva variante' }}
            </h3>
          </div>
        </template>

        <ProductVariantForm
          :product-id="productId"
          :variant="variant"
          :loading="loading"
          @submit="onSubmit"
        />
      </UCard>
    </template>
  </UModal>
</template>
