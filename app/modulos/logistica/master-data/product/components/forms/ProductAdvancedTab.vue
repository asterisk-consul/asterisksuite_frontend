<script setup lang="ts">
import type { CreateProductDto } from '~/modulos/logistica/master-data/product/types/product.types'

const form = defineModel<CreateProductDto>({
  required: true
})
</script>

<template>
  <div class="space-y-4 p-1">
    <USwitch v-model="form.price_enabled" label="Precio habilitado" />

    <USwitch v-model="form.is_rate_type" label="Es tipo tarifa" />

    <USwitch v-model="form.is_composed" label="Producto compuesto" />
  </div>
</template>
