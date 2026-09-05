<script setup lang="ts">
import type { CreateProductDto } from '~/modulos/logistica/master-data/product/types/product.types'
import { useUnitsStore } from '~/modulos/almacen/units/store/units.store'
import ProductStockTab from '~/modulos/logistica/master-data/product/stock/components/ProductStockTab.vue'

const props = defineProps<{
  productId?: string
  mode?: 'create' | 'edit'
}>()

const form = defineModel<CreateProductDto>({
  required: true
})

const unitsStore = useUnitsStore()
const { items: units } = storeToRefs(unitsStore)

onMounted(async () => {
  if (units.value.length === 0) {
    await unitsStore.fetchAll()
  }
})

const unitOptions = computed(() =>
  units.value
    .filter((u) => u.active)
    .map((u) => ({
      label: `${u.name} (${u.symbol})`,
      value: u.id
    }))
)
</script>

<template>
  <div class="space-y-4 p-1">
    <USwitch v-model="form.manages_stock" label="Maneja stock" />

    <USwitch
      v-model="form.requires_refrigeration"
      label="Requiere refrigeración"
    />

    <UFormField v-if="form.manages_stock" label="Unidad de medida">
      <USelect
        v-model="form.unit_id"
        :items="unitOptions"
        placeholder="Seleccionar unidad"
        class="w-full"
      />
    </UFormField>

    <!-- Depósitos (solo en modo edición y con manages_stock) -->
    <div
      v-if="mode === 'edit' && productId && form.manages_stock"
      class="pt-4 border-t border-neutral-200 dark:border-neutral-700"
    >
      <h4 class="text-sm font-semibold mb-3">Stock en depósitos</h4>
      <ProductStockTab :product-id="productId" />
    </div>
  </div>
</template>
