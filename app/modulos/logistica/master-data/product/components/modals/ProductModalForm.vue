<script lang="ts" setup>
import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'

const open = defineModel<boolean>('open')
import { productTypeOptions, usageTypeOptions, calculationTypeOptions } from '~/modulos/logistica/master-data/product/utils/product-options.utils'
import { useTaxCategories } from '~/modulos/erp/tax-engine/composables/useTaxCategories'

const form = defineModel<ProductFormState>('form', {
  required: true
})

const emit = defineEmits<{
  submit: []
}>()

const router = useRouter()

const { categoryOptions, fetchAll } = useTaxCategories()

onMounted(() => {
  fetchAll()
})

const openCreate = () => {
  const params = new URLSearchParams()
  if (form.value.name) params.set('name', form.value.name)
  if (form.value.sku) params.set('sku', form.value.sku)
  if (form.value.product_type) params.set('product_type', form.value.product_type)
  if (form.value.usage_type) params.set('usage_type', form.value.usage_type)
  if (form.value.calculation_type) params.set('calculation_type', form.value.calculation_type)
  if (form.value.tax_category_id) params.set('tax_category_id', form.value.tax_category_id)

  router.push(`/productos/create?${params.toString()}`)
}
</script>

<template>
  <UModal v-model:open="open" title="Nuevo Producto" :ui="{ width: 'max-w-lg' }">
    <template #body>
      <div class="space-y-3">
        <UFormField label="Nombre" required>
          <UInput v-model="form.name" class="w-full" placeholder="Nombre del producto" />
        </UFormField>

        <UFormField label="SKU">
          <UInput v-model="form.sku" class="w-full" placeholder="Código interno (opcional)" />
        </UFormField>

        <UFormField label="Tipo de producto">
          <USelect v-model="form.product_type" :items="productTypeOptions" class="w-full" />
        </UFormField>

        <UFormField label="Uso del producto">
          <USelect v-model="form.usage_type" :items="usageTypeOptions" class="w-full" />
        </UFormField>

        <UFormField label="Tipo cálculo">
          <USelect v-model="form.calculation_type" :items="calculationTypeOptions" class="w-full" />
        </UFormField>

        <UFormField label="Categoría Fiscal">
          <USelect v-model="form.tax_category_id" :items="categoryOptions" placeholder="Seleccionar..." class="w-full" />
        </UFormField>
      </div>
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
