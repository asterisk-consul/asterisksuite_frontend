<script setup lang="ts">
import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'

import ProductGeneralForm from '~/modulos/logistica/master-data/product/components/forms/ProductGeneralForm.vue'

const props = defineProps<{
  form: ProductFormState
}>()
</script>

<template>
  <ProductGeneralForm :form="form" />
</template>
