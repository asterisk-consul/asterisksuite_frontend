<script setup lang="ts">
import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'

import {
  productTypeOptions,
  usageTypeOptions,
  calculationTypeOptions,
  productTypeConfig,
  usageTypeConfig
} from '~/modulos/logistica/master-data/product/utils/product-options.utils'
import { useTaxCategories } from '~/modulos/erp/tax-engine/composables/useTaxCategories'
import { useUnitsStore } from '~/modulos/almacen/units/store/units.store'
import type { UnitType } from '~/modulos/almacen/units/types/units.types'

const props = defineProps<{
  form: ProductFormState
}>()

const { categoryOptions, fetchAll } = useTaxCategories()
const unitsStore = useUnitsStore()
const { items: units } = storeToRefs(unitsStore)

const expectedUnitType = computed<UnitType>(() => ({
  UNIT: 'UNIT',
  LINEAR: 'LENGTH',
  VOLUME: 'VOLUME',
  SURFACE: 'WEIGHT'
}[props.form.calculation_type ?? 'UNIT'] as UnitType))

const unitOptions = computed(() => units.value
  .filter(unit => unit.active)
  .sort((a, b) => Number(b.unit_type === expectedUnitType.value) - Number(a.unit_type === expectedUnitType.value))
  .map(unit => ({
    label: `${unit.name} (${unit.symbol})${unit.unit_type === expectedUnitType.value ? ' · recomendada' : ''}`,
    value: unit.id
  })))

const calculationHelp = computed(() => ({
  UNIT: 'El BOM consume una cantidad directa, por ejemplo 4 unidades.',
  LINEAR: 'El BOM convierte el largo cargado a metros. Usá una unidad de longitud, por ejemplo m.',
  VOLUME: 'El BOM calcula largo × ancho × alto en m³. Usá una unidad de volumen.',
  SURFACE: 'El cálculo de ingeniería obtiene el peso usando superficie, espesor y densidad. La unidad de stock recomendada es kg.'
}[props.form.calculation_type ?? 'UNIT']))

onMounted(async () => {
  await Promise.all([fetchAll(), unitsStore.fetchAll()])
})
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
    <UFormField label="Nombre" required>
      <UInput v-model="form.name" class="w-full" placeholder="Nombre del producto" />
    </UFormField>

    <UFormField label="SKU">
      <UInput v-model="form.sku" class="w-full" placeholder="Código interno (opcional)" />
    </UFormField>

    <div class="flex items-end gap-1">
      <UFormField label="Tipo de producto" class="flex-1">
        <USelect v-model="form.product_type" :items="productTypeOptions" class="w-full" />
      </UFormField>
      <UPopover :ui="{ content: 'w-80' }">
        <UButton icon="i-lucide-help-circle" variant="ghost" size="sm" class="mb-1" color="neutral" />
        <template #content>
          <div class="p-4 space-y-3">
            <p class="text-sm font-semibold text-muted">Tipos de producto</p>
            <div class="space-y-2">
              <div v-for="(config, key) in productTypeConfig" :key="key" class="flex items-start gap-2">
                <UBadge :label="config.label" :color="config.color" variant="soft" size="xs" class="mt-0.5 shrink-0" />
                <span class="text-xs text-muted">
                  <template v-if="key === 'RAW_MATERIAL'">Insumo que se consume en producción</template>
                  <template v-else-if="key === 'FINISHED_PRODUCT'">Producto final listo para venta</template>
                  <template v-else-if="key === 'SEMI_FINISHED'">Semi-terminado para otros productos</template>
                  <template v-else-if="key === 'SERVICE'">Servicio que se presta</template>
                  <template v-else-if="key === 'RATES'">Tarifa de transporte o servicio</template>
                </span>
              </div>
            </div>
          </div>
        </template>
      </UPopover>
    </div>

    <div class="flex items-end gap-1">
      <UFormField label="Uso del producto" class="flex-1">
        <USelect v-model="form.usage_type" :items="usageTypeOptions" class="w-full" />
      </UFormField>
      <UPopover :ui="{ content: 'w-72' }">
        <UButton icon="i-lucide-help-circle" variant="ghost" size="sm" class="mb-1" color="neutral" />
        <template #content>
          <div class="p-4 space-y-3">
            <p class="text-sm font-semibold text-muted">Uso del producto</p>
            <div class="space-y-2">
              <div v-for="(config, key) in usageTypeConfig" :key="key" class="flex items-start gap-2">
                <UBadge :label="config.label" :color="config.color" variant="soft" size="xs" class="mt-0.5 shrink-0" />
                <span class="text-xs text-muted">
                  <template v-if="key === 'SALE'">Solo aparece en facturas de venta</template>
                  <template v-else-if="key === 'PURCHASE'">Solo aparece en facturas de compra</template>
                  <template v-else-if="key === 'BOTH'">Aparece en ambos tipos de documento</template>
                </span>
              </div>
            </div>
          </div>
        </template>
      </UPopover>
    </div>

    <UFormField label="Cálculo en BOM" :description="calculationHelp">
      <USelect v-model="form.calculation_type" :items="calculationTypeOptions" class="w-full" />
    </UFormField>

    <UFormField v-if="form.manages_stock" label="Unidad de stock" description="Es la unidad que verás en depósitos, movimientos y disponibilidad.">
      <USelect v-model="form.unit_id" :items="unitOptions" placeholder="Seleccionar unidad de medida" class="w-full" />
    </UFormField>

    <UFormField label="Categoría Fiscal">
      <USelect
        v-model="form.tax_category_id"
        :items="categoryOptions"
        placeholder="Seleccionar categoría fiscal"
        class="w-full"
      />
    </UFormField>

    <div class="md:col-span-2">
      <USwitch v-model="form.active" label="Activo" />
    </div>
  </div>
</template>
