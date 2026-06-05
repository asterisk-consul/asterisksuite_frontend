<script setup lang="ts">
import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'

import { ProductCostSourceOptions } from '~/modulos/logistica/master-data/product/utils/product-options.utils'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'

const { init, selectItems } = useCurrencies()
const props = defineProps<{ form: ProductFormState }>()

console.log(props.form)

onMounted(() => init())
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
    <UFormField label="Fuente de costo" required>
      <USelect v-model="form.cost_source" :items="ProductCostSourceOptions" class="w-full" />
    </UFormField>
    <UFormField label="Moneda" required>
      <USelect v-model="form.cost_currency_id" :items="selectItems" class="w-full" />
    </UFormField>
  </div>
</template>
