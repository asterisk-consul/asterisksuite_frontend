<script lang="ts" setup>
import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'
const open = defineModel<boolean>('open')

import { productTypeOptions } from '~/modulos/logistica/master-data/product/utils/product-options.utils'

const form = defineModel<ProductFormState>('form', {
  required: true
})
const router = useRouter()

const openCreate = () => {
  router.push('/productos/create')
}
</script>

<template>
  <UModal v-model:open="open" title="Nuevo Producto">
    <template #body>
      <UFormField label="Nombre" required>
        <UInput v-model="form.name" class="w-full" />
      </UFormField>

      <UFormField label="SKU">
        <UInput v-model="form.sku" class="w-full" />
      </UFormField>

      <UFormField label="Tipo de producto">
        <USelect v-model="form.product_type" :items="productTypeOptions" class="w-full" />
      </UFormField>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton label="Crear producto Completp" color="neutral" variant="ghost" @click="openCreate" />
        <div class="flex justify-end">
          <UButton type="submit">Guardar</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
