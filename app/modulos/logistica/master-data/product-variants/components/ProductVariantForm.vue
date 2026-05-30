<script setup lang="ts">
import { reactive, computed, watch } from 'vue'

import type {
  ProductVariant,
  CreateProductVariantInput
} from '~/modulos/logistica/master-data/product-variants/types/product-variants.types'

const props = defineProps<{
  productId: string

  variant?: ProductVariant | null

  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: CreateProductVariantInput]
}>()

// =========================
// MODE
// =========================

const isEditing = computed(() => !!props.variant)

// =========================
// FORM
// =========================

const form = reactive<CreateProductVariantInput>({
  product_id: props.productId,

  name: '',

  sku: '',

  thickness_mm: undefined,

  density_kg_m3: undefined,

  weight_kg: undefined,

  active: true
})

// =========================
// LOAD EDIT DATA
// =========================

watch(
  () => props.variant,
  (variant) => {
    if (!variant) {
      form.product_id = props.productId

      form.name = ''

      form.sku = ''

      form.thickness_mm = undefined

      form.density_kg_m3 = undefined

      form.weight_kg = undefined

      form.active = true

      return
    }

    form.product_id = variant.product_id

    form.name = variant.name || ''

    form.sku = variant.sku || ''

    form.thickness_mm = variant.thickness_mm ?? undefined

    form.density_kg_m3 = variant.density_kg_m3 ?? undefined

    form.weight_kg = variant.weight_kg ?? undefined

    form.active = variant.active ?? true
  },
  {
    immediate: true
  }
)

// =========================
// SUBMIT
// =========================

const onSubmit = () => {
  emit('submit', {
    ...form
  })
}
</script>

<template>
  <UForm :state="form" class="space-y-4" @submit="onSubmit">
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Nombre">
        <UInput v-model="form.name" />
      </UFormField>

      <UFormField label="SKU">
        <UInput v-model="form.sku" />
      </UFormField>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <UFormField label="Espesor (mm)">
        <UInputNumber v-model="form.thickness_mm" />
      </UFormField>

      <UFormField label="Densidad (kg/m3)">
        <UInputNumber v-model="form.density_kg_m3" />
      </UFormField>

      <UFormField label="Peso (kg)">
        <UInputNumber v-model="form.weight_kg" />
      </UFormField>
    </div>

    <UCheckbox v-model="form.active" label="Activo" />

    <div class="flex justify-end">
      <UButton type="submit" :loading="loading">
        {{ isEditing ? 'Actualizar' : 'Crear variante' }}
      </UButton>
    </div>
  </UForm>
</template>
