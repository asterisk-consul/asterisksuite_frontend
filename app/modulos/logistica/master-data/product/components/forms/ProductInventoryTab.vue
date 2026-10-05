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

    <div v-if="form.manages_stock" class="rounded-lg border border-default bg-muted/30 p-4 space-y-3">
      <div><p class="font-medium">Conversión de compra</p><p class="text-sm text-muted">Define cómo una unidad del proveedor se convierte a la unidad en la que controlás stock y costos.</p></div>
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField label="Unidad habitual de compra"><USelect v-model="form.purchase_unit_id" :items="unitOptions" placeholder="Igual que la unidad de stock" class="w-full" /></UFormField>
        <UFormField label="Equivalencia" :description="`1 unidad de compra ingresa ${Number(form.purchase_to_stock_factor || 1)} unidades de stock`"><UInput v-model.number="form.purchase_to_stock_factor" type="number" min="0.000001" step="0.000001" class="w-full" /></UFormField>
      </div>
      <UAlert color="info" variant="subtle" title="Ejemplo" description="Si comprás rollos de 100 m y el stock se controla en metros, configurá factor 100. El costo de compra se dividirá por 100." />
    </div>

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
