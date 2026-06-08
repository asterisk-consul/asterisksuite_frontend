<script setup lang="ts">
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
import { createDefaultProductForm } from '~/modulos/logistica/master-data/product/utils/product-form.utils'
import ProductForm from '~/modulos/logistica/master-data/product/components/ProductForm.vue'

const productStore = useProductsStore()
const form = ref(createDefaultProductForm())

async function handleSubmit() {
  await productStore.create(form.value)
}
</script>

<template>
  <UPageCard title="Nuevo producto">
    <ProductForm v-model="form" mode="create" @submit="handleSubmit" />
  </UPageCard>
</template>
