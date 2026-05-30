<script setup lang="ts">
import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'
import ProductCategorySelect from '~/modulos/logistica/master-data/product-categories/components/ProductCategorySelect.vue'
import ProductTagsSelect from '~/modulos/logistica/master-data/product-tags/components/ProductTagSelect.vue'
import type { Category } from '~/modulos/almacen/categories/types/categories.types'
import type { ProductTag } from '~/modulos/logistica/master-data/product-tags/types/product-tags.types'

defineProps<{
  categories: Category[]
  tags: ProductTag[]
}>()

const form = defineModel<ProductFormState>({
  required: true
})

const productTypeOptions = [
  {
    label: 'Materia prima',
    value: 'RAW_MATERIAL'
  },
  {
    label: 'Producto terminado',
    value: 'FINISHED_PRODUCT'
  },
  {
    label: 'Producto intermedio',
    value: 'SEMI_FINISHED'
  },
  {
    label: 'Servicio',
    value: 'SERVICE'
  },
  {
    label: 'Consumible',
    value: 'CONSUMABLE'
  }
]

const calculationTypeOptions = [
  {
    label: 'Unidad',
    value: 'UNIT'
  },
  {
    label: 'Superficie',
    value: 'SURFACE'
  },
  {
    label: 'Volumen',
    value: 'VOLUME'
  },
  {
    label: 'Lineal',
    value: 'LINEAR'
  }
]
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
      <USelect
        v-model="form.product_type"
        :items="productTypeOptions"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Tipo cálculo">
      <USelect
        v-model="form.calculation_type"
        :items="calculationTypeOptions"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Categorías">
      <ProductCategorySelect
        v-model="form.category_ids"
        :categories="categories"
      />
    </UFormField>
    <UFormField label="Tags">
      <ProductTagsSelect v-model="form.tag_ids" :tags="tags" />
    </UFormField>

    <div class="md:col-span-2">
      <USwitch v-model="form.active" label="Activo" />
    </div>
  </div>
</template>
