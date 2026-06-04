<script setup lang="ts">
import type { CreateProductDto } from '~/modulos/logistica/master-data/product/types/product.types'

const form = defineModel<CreateProductDto>({
  required: true
})
</script>

<template>
  <div class="space-y-4 p-1">
    <USwitch v-model="form.manages_stock" label="Maneja stock" />

    <USwitch
      v-model="form.requires_refrigeration"
      label="Requiere refrigeración"
    />
  </div>
</template>
