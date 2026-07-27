<script setup lang="ts">
import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'

import {
  productTypeOptions,
  calculationTypeOptions
} from '~/modulos/logistica/master-data/product/utils/product-options.utils'
import { useTaxCategories } from '~/modulos/erp/tax-engine/composables/useTaxCategories'

const props = defineProps<{
  form: ProductFormState
}>()

const { categoryOptions, fetchAll } = useTaxCategories()

onMounted(() => {
  fetchAll()
})
</script>
<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
    <UFormField label="Nombre" required>
      <UInput v-model="form.name" class="w-full" />
    </UFormField>

    <UFormField label="SKU">
      <UInput v-model="form.sku" class="w-full" />
    </UFormField>

    <UFormField label="Tipo de producto">
      <USelect v-model="form.product_type" :items="productTypeOptions" class="w-full" />
    </UFormField>

    <UFormField label="Tipo cálculo">
      <USelect v-model="form.calculation_type" :items="calculationTypeOptions" class="w-full" />
    </UFormField>

    <UFormField label="Categoría Fiscal">
      <USelect
        v-model="form.tax_category_id"
        :items="categoryOptions"
        placeholder="Seleccionar categoría fiscal"
        class="w-full"
      />
    </UFormField>

    <div class="md:col-span-2">
      <USwitch v-model="form.active" label="Activo" />
    </div>
  </div>
</template>
