<script lang="ts" setup>
import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'

const open = defineModel<boolean>('open')
import { productTypeOptions } from '~/modulos/logistica/master-data/product/utils/product-options.utils'

const form = defineModel<ProductFormState>('form', {
  required: true
})

const emit = defineEmits<{
  submit: []
}>()

const router = useRouter()

const openCreate = () => {
  router.push('/productos/create')
}
</script>

<template>
  <UModal v-model:open="open" title="Nuevo Producto">
    <template #body>
      <UFormField label="Nombre" required class="mb-2">
        <UInput v-model="form.name" class="w-full" />
      </UFormField>

      <UFormField label="SKU">
        <UInput v-model="form.sku" class="w-full mb-2" />
      </UFormField>

      <UFormField label="Tipo de producto" class="mb-2">
        <USelect v-model="form.product_type" :items="productTypeOptions" class="w-full" />
      </UFormField>
    </template>

    <template #footer>
      <div class="flex items-center justify-between gap-2 w-full">
        <UTooltip text="Abrir el formulario completo de productos">
         <UButton
        icon="i-lucide-settings"
        label="Configuración avanzada"
        color="neutral"
        variant="soft"
        @click="openCreate"
        class="cursor-pointer"
      />
        </UTooltip>
        <div class="flex justify-end">
          <UButton type="submit" class="cursor-pointer" @click="emit('submit')">Guardar</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
