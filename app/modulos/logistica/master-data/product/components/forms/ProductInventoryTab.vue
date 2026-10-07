<script setup lang="ts">
import type { CreateProductDto } from '~/modulos/logistica/master-data/product/types/product.types'
import { useUnitsStore } from '~/modulos/almacen/units/store/units.store'
import ProductStockTab from '~/modulos/logistica/master-data/product/stock/components/ProductStockTab.vue'
import ReplenishmentPolicies from '~/modulos/logistica/master-data/product/stock/components/ReplenishmentPolicies.vue'
import { useRoles } from '~/modulos/access-control/composables/useRoles'

const props = defineProps<{
  productId?: string
  mode?: 'create' | 'edit'
}>()

const form = defineModel<CreateProductDto>({
  required: true
})

const unitsStore = useUnitsStore()
const { items: units } = storeToRefs(unitsStore)
const showPurchaseConversion = ref(false)
const { hasPermission, fetchMyPermissionsIfNeeded } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const canReadReplenishment = computed(() => isOwnerOrAdmin.value || hasPermission('stock.replenishment.read'))
const canConfigureReplenishment = computed(() => isOwnerOrAdmin.value || hasPermission('stock.replenishment.configure'))

onMounted(async () => {
  await fetchMyPermissionsIfNeeded()
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

const stockUnit = computed(() => units.value.find((unit) => unit.id === form.value.unit_id))
const purchaseUnit = computed(() => units.value.find((unit) => unit.id === form.value.purchase_unit_id) ?? stockUnit.value)
const purchaseFactor = computed(() => Number(form.value.purchase_to_stock_factor || 1))
const conversionSummary = computed(() => {
  const purchaseLabel = purchaseUnit.value?.symbol || purchaseUnit.value?.name || 'unidad de compra'
  const stockLabel = stockUnit.value?.symbol || stockUnit.value?.name || 'unidad de stock'
  return `1 ${purchaseLabel} = ${purchaseFactor.value.toLocaleString('es-AR')} ${stockLabel}`
})
</script>

<template>
  <div class="space-y-4 p-1">
    <USwitch v-model="form.manages_stock" label="Maneja stock" />

    <USwitch
      v-model="form.requires_refrigeration"
      label="Requiere refrigeración"
    />

    <div v-if="form.manages_stock" class="overflow-hidden rounded-lg border border-default bg-muted/20">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/40"
        :aria-expanded="showPurchaseConversion"
        @click="showPurchaseConversion = !showPurchaseConversion"
      >
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <p class="font-medium">Conversión de compra</p>
            <UBadge color="neutral" variant="subtle">{{ conversionSummary }}</UBadge>
          </div>
          <p class="mt-1 text-sm text-muted">
            Si no configurás una equivalencia especial, el sistema utiliza 1 a 1.
          </p>
        </div>
        <UIcon name="i-lucide-chevron-down" class="size-5 shrink-0 text-muted transition-transform" :class="{ 'rotate-180': showPurchaseConversion }" />
      </button>

      <div v-if="showPurchaseConversion" class="space-y-3 border-t border-default p-4">
        <p class="text-sm text-muted">
          Usala cuando comprás en una presentación distinta de la unidad con la que controlás stock y costos.
        </p>
        <div class="grid gap-3 sm:grid-cols-2">
          <UFormField label="Unidad habitual de compra">
            <USelect v-model="form.purchase_unit_id" :items="unitOptions" placeholder="Igual que la unidad de stock" class="w-full" />
          </UFormField>
          <UFormField label="Equivalencia" :description="`Cada unidad comprada ingresa ${purchaseFactor} unidades al stock`">
            <UInput v-model.number="form.purchase_to_stock_factor" type="number" min="0.000001" step="0.000001" class="w-full" />
          </UFormField>
        </div>
        <UAlert color="info" variant="subtle" title="Ejemplo" description="Si comprás un rollo de 100 m y controlás el stock en metros, elegí Rollo y configurá 100. El costo del rollo se dividirá entre los 100 metros." />
      </div>
    </div>

    <ReplenishmentPolicies v-if="mode === 'edit' && productId && form.manages_stock && canReadReplenishment" :product-id="productId" :can-configure="canConfigureReplenishment" />

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
