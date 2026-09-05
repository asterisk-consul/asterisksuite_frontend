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

  weight_per_m2_kg: undefined,

  weight_per_meter_kg: undefined,

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

    form.weight_per_m2_kg = undefined

    form.weight_per_meter_kg = undefined

    form.active = true

    return
  }

  form.product_id = variant.product_id

  form.name = variant.name || ''

  form.sku = variant.sku || ''

  form.thickness_mm = variant.thickness_mm ?? undefined

  form.density_kg_m3 = variant.density_kg_m3 ?? undefined

  form.weight_kg = variant.weight_kg ?? undefined

  form.weight_per_m2_kg = variant.weight_per_m2_kg ?? undefined

  form.weight_per_meter_kg = variant.weight_per_meter_kg ?? undefined

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
    ...form,
    thickness_mm: form.thickness_mm != null ? Number(form.thickness_mm) : undefined,
    density_kg_m3: form.density_kg_m3 != null ? Number(form.density_kg_m3) : undefined,
    weight_kg: form.weight_kg != null ? Number(form.weight_kg) : undefined,
    weight_per_m2_kg: form.weight_per_m2_kg != null ? Number(form.weight_per_m2_kg) : undefined,
    weight_per_meter_kg: form.weight_per_meter_kg != null ? Number(form.weight_per_meter_kg) : undefined
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
        <UInputNumber v-model="form.thickness_mm" :step="0.001" />
      </UFormField>

      <UFormField label="Densidad (kg/m3)">
        <UInputNumber v-model="form.density_kg_m3" :step="0.001" />
      </UFormField>

      <UFormField label="Peso (kg)">
        <UInputNumber v-model="form.weight_kg" :step="0.001" />
      </UFormField>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Peso por m2 (kg)">
        <UInputNumber v-model="form.weight_per_m2_kg" :step="0.001" />
      </UFormField>

      <UFormField label="Peso por metro (kg)">
        <UInputNumber v-model="form.weight_per_meter_kg" :step="0.001" />
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
