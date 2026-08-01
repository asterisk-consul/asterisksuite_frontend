<script setup lang="ts">
import { computed, reactive, ref, onMounted, inject } from 'vue'

import type { Product } from '~/modulos/logistica/master-data/product/types/product.types'
import type { Currency } from '~/modulos/erp/currencies/types/currencies.types'

import { useProductPriceStore } from '~/modulos/logistica/master-data/product-price/store/product-price.store'
import { useVariantCostsStore } from '~/modulos/logistica/master-data/variant-cost/store/variant-costs.store'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import ProductPriceHistory from '~/modulos/logistica/master-data/product-price/components/ProductPriceHistory.vue'

const props = withDefaults(
  defineProps<{
    product?: Product | null
    priceEnabled?: boolean
  }>(),
  {
    priceEnabled: true
  }
)

const emit = defineEmits<{
  'update:priceEnabled': [value: boolean]
}>()

const switchToAdvanced = inject<() => void>('switchToAdvancedTab')

const productPriceStore = useProductPriceStore()
const variantCostsStore = useVariantCostsStore()
const { selectItems: currencyOptions, init: initCurrencies, findById: findCurrency } = useCurrencies()
const toast = useToast()

const product = computed(() => props.product)

const isFinishedProduct = computed(() => product.value?.product_type === 'FINISHED_PRODUCT')
const hasVariants = computed(() => (product.value?.product_variants?.length ?? 0) > 0)
const hasCalculatedCost = computed(() => !!product.value?.current_cost)
const hasCostTemplate = computed(() => !!product.value?.cost_template_id)
const hasExistingPrices = computed(() => (product.value?.product_price?.length ?? 0) > 0)

const latestProductCost = computed(() => {
  const costs = product.value?.product_costs
  if (!costs?.length) return null
  return costs[costs.length - 1]
})

const canAddProductPrice = computed(() => isFinishedProduct.value && !hasVariants.value && !hasCalculatedCost.value)

// auto_calculate_cost: cuando está activo, el costo calculado es el precio de venta
const autoCalculate = computed(() => product.value?.auto_calculate_cost === true)
const showCostAsPrice = computed(() => autoCalculate.value && hasCalculatedCost.value)

const existingProductPrices = computed(() => product.value?.product_price ?? [])

const existingVariantCosts = computed(
  () =>
    product.value?.product_variants?.flatMap((variant) =>
      (variant.productVariantCosts ?? []).map((cost) => ({
        ...cost,
        variant_name: variant.name,
        variant_sku: variant.sku
      }))
    ) ?? []
)

const hasAnyData = computed(() => existingProductPrices.value.length > 0 || existingVariantCosts.value.length > 0)

// Pricing mode: manual vs from costs
type PricingMode = 'manual' | 'from_costs'

const pricingMode = ref<PricingMode>('manual')

const defaultPricingMode = computed<PricingMode>(() => {
  if (hasExistingPrices.value) return 'manual'
  if (hasCalculatedCost.value || hasCostTemplate.value) return 'from_costs'
  return 'manual'
})

const showPricingDecision = computed(() =>
  isFinishedProduct.value && !hasVariants.value && props.priceEnabled && !hasAnyData.value && !hasCalculatedCost.value
)

const goToBom = () => {
  if (product.value?.id) {
    navigateTo(`/bom/${product.value.id}`)
  }
}

const formatMoney = (value?: string | number | null, currency?: Currency | null) => {
  if (value === null || value === undefined) return '-'
  return `${currency?.symbol ?? '$'} ${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  PURCHASE: 'Compra',
  IMPORT: 'Importación',
  PRODUCTION: 'Producción'
}

// =========================
// MODAL: PRODUCT PRICE (create + edit)
// =========================

const showProductPriceModal = ref(false)
const loadingProductPrice = ref(false)
const editingPriceId = ref<string | null>(null)

const productPriceForm = reactive({
  currency_id: '',
  price: undefined as number | undefined,
  exemption_rate: 0
})

const isEditingPrice = computed(() => !!editingPriceId.value)
const productPriceModalTitle = computed(() => (isEditingPrice.value ? 'Editar precio' : 'Nuevo precio'))

const resetProductPriceForm = () => {
  productPriceForm.currency_id = ''
  productPriceForm.price = undefined
  productPriceForm.exemption_rate = 0
  editingPriceId.value = null
}

const openCreateProductPriceModal = () => {
  resetProductPriceForm()
  showProductPriceModal.value = true
}

const openEditProductPriceModal = (price: any) => {
  editingPriceId.value = price.id
  productPriceForm.currency_id = price.currency_id ?? ''
  productPriceForm.price = Number(price.price) ?? undefined
  productPriceForm.exemption_rate = Number(price.exemption_rate ?? 0)
  showProductPriceModal.value = true
}

const submitProductPrice = async () => {
  if (!product.value?.id || !productPriceForm.currency_id || !productPriceForm.price) return

  try {
    loadingProductPrice.value = true

    if (isEditingPrice.value && editingPriceId.value) {
      await productPriceStore.update(editingPriceId.value, {
        price: productPriceForm.price,
        exemption_rate: productPriceForm.exemption_rate
      })
      toast.add({ title: 'Precio actualizado', color: 'success' })
    } else {
      await productPriceStore.create({
        product_id: product.value.id,
        currency_id: productPriceForm.currency_id,
        price: productPriceForm.price,
        exemption_rate: productPriceForm.exemption_rate
      })
      toast.add({ title: 'Precio creado', color: 'success' })
    }

    if (product.value) {
      await productPriceStore.fetchByProduct(product.value.id)
      product.value.product_price = productPriceStore.items as any
    }

    showProductPriceModal.value = false
  } catch (err: any) {
    const msg = err?.data?.message ?? 'Error desconocido'
    toast.add({ title: 'Error al guardar precio', description: msg, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    loadingProductPrice.value = false
  }
}

// =========================
// DELETE: PRODUCT PRICE
// =========================

const showDeletePriceConfirm = ref(false)
const deletingPriceId = ref<string | null>(null)
const loadingDelete = ref(false)

const openDeletePriceConfirm = (priceId: string) => {
  deletingPriceId.value = priceId
  showDeletePriceConfirm.value = true
}

const confirmDeletePrice = async () => {
  if (!deletingPriceId.value || !product.value?.id) return

  try {
    loadingDelete.value = true
    await productPriceStore.remove(deletingPriceId.value)

    if (product.value) {
      await productPriceStore.fetchByProduct(product.value.id)
      product.value.product_price = productPriceStore.items as any
    }

    toast.add({ title: 'Precio eliminado', color: 'success' })
    showDeletePriceConfirm.value = false
  } catch (err: any) {
    const msg = err?.data?.message ?? 'Error desconocido'
    toast.add({ title: 'Error al eliminar precio', description: msg, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    loadingDelete.value = false
  }
}

// =========================
// HISTORY
// =========================

const showHistoryModal = ref(false)
const historyPriceId = ref<string | null>(null)

const openHistory = (priceId: string) => {
  historyPriceId.value = priceId
  showHistoryModal.value = true
}

// =========================
// MODAL: VARIANT COST
// =========================

const showVariantCostModal = ref(false)
const loadingVariantCost = ref(false)

const variantCostForm = reactive({
  variant_id: '',
  currency_id: '',
  source: 'MANUAL' as 'MANUAL' | 'PURCHASE' | 'IMPORT' | 'PRODUCTION',
  cost: undefined as number | undefined,
  supplier: '',
  notes: ''
})

const resetVariantCostForm = () => {
  variantCostForm.variant_id = ''
  variantCostForm.currency_id = ''
  variantCostForm.source = 'MANUAL'
  variantCostForm.cost = undefined
  variantCostForm.supplier = ''
  variantCostForm.notes = ''
}

const openVariantCostModal = () => {
  resetVariantCostForm()
  showVariantCostModal.value = true
}

const variantOptions = computed(() =>
  (product.value?.product_variants ?? []).map((v) => ({
    label: `${v.sku ? v.sku + ' - ' : ''}${v.name ?? ''}`,
    value: v.id
  }))
)

const sourceOptions = [
  { label: 'Manual', value: 'MANUAL' },
  { label: 'Compra', value: 'PURCHASE' },
  { label: 'Importación', value: 'IMPORT' },
  { label: 'Producción', value: 'PRODUCTION' }
]

const submitVariantCost = async () => {
  if (!variantCostForm.variant_id || !variantCostForm.currency_id || !variantCostForm.cost) return

  try {
    loadingVariantCost.value = true
    const created = await variantCostsStore.create({
      variant_id: variantCostForm.variant_id,
      currency_id: variantCostForm.currency_id,
      source: variantCostForm.source,
      cost: variantCostForm.cost,
      supplier: variantCostForm.supplier || undefined,
      notes: variantCostForm.notes || undefined
    })

    if (product.value?.product_variants) {
      const variant = product.value.product_variants.find((v) => v.id === variantCostForm.variant_id)
      if (variant) {
        variant.productVariantCosts = [...(variant.productVariantCosts ?? []), created as any]
      }
    }

    toast.add({ title: 'Costo de variante creado', color: 'success' })
    showVariantCostModal.value = false
  } catch (err: any) {
    const msg = err?.data?.message ?? 'Error desconocido'
    toast.add({ title: 'Error al crear costo', description: msg, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    loadingVariantCost.value = false
  }
}

const handleEnablePrice = () => {
  emit('update:priceEnabled', true)
}

const goToAdvanced = () => {
  switchToAdvanced?.()
}

onMounted(async () => {
  await initCurrencies()
})
</script>

<template>
  <div class="space-y-6">
    <!-- HEADER -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold">Precios y costos</h3>
        <p class="text-sm text-gray-500">
          {{ hasVariants ? 'Costos por variante del producto' : 'Precio del producto terminado' }}
        </p>
      </div>

      <div class="flex gap-2">
        <UButton
          v-if="priceEnabled && canAddProductPrice && pricingMode === 'manual'"
          icon="i-lucide-plus"
          size="sm"
          @click="openCreateProductPriceModal"
        >
          Agregar precio
        </UButton>

        <UButton v-if="priceEnabled && hasVariants" icon="i-lucide-plus" size="sm" @click="openVariantCostModal">
          Agregar costo de variante
        </UButton>
      </div>
    </div>

    <!-- PRICE DISABLED STATE -->
    <UCard v-if="!priceEnabled">
      <div class="py-10 text-center space-y-4">
        <UIcon name="i-lucide-wallet-off" class="mx-auto h-10 w-10 text-amber-400" />
        <div>
          <p class="text-sm font-semibold text-gray-900">Precio inhabilitado</p>
          <p class="text-sm text-gray-500 mt-1">
            Este producto no tiene precios de venta habilitados.
            <br />
            Activalo para poder asignar precios y usarlo en facturación.
          </p>
        </div>
        <div class="flex gap-2 justify-center">
          <UButton size="sm" icon="i-lucide-check" @click="handleEnablePrice">Habilitar precio</UButton>
          <UButton size="sm" variant="outline" icon="i-lucide-settings-2" @click="goToAdvanced">Ir a Avanzado</UButton>
        </div>
      </div>
    </UCard>

    <!-- COST AS PRICE (auto_calculate_cost activo) -->
    <UCard v-if="showCostAsPrice">
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-calculator" class="size-5 text-primary" />
        <div>
          <p class="text-sm font-semibold">Precio desde costo</p>
          <p class="text-xs text-muted">Este producto usa el costo calculado como precio de venta.</p>
        </div>
        <UBadge label="Automático" color="primary" variant="soft" size="sm" />
      </div>
      <div class="mt-3 pt-3 border-t">
        <p class="text-2xl font-bold">
          {{ formatMoney(product?.current_cost, latestProductCost?.currencies) }}
        </p>
        <p v-if="product?.last_cost_calculated_at" class="text-xs text-muted mt-1">
          Último cálculo: {{ new Date(product.last_cost_calculated_at).toLocaleString('es-AR') }}
        </p>
      </div>
    </UCard>

    <!-- PRICING DECISION CARD (solo FINISHED_PRODUCT sin variantes) -->
    <UCard v-if="showPricingDecision">
      <div class="space-y-4">
        <div>
          <p class="text-sm font-semibold text-gray-900">¿Cómo querés definir el precio de venta?</p>
          <p class="text-sm text-gray-500 mt-1">
            Elegí si querés ingresar el precio manualmente o calcularlo desde los costos de producción.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            class="flex flex-col items-start p-4 rounded-lg border-2 transition-colors text-left"
            :class="pricingMode === 'manual' ? 'border-primary-500 bg-primary-50 dark:bg-primary-950' : 'border-default hover:border-default-hover'"
            @click="pricingMode = 'manual'"
          >
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-lucide-pencil" class="h-4 w-4" :class="pricingMode === 'manual' ? 'text-primary-600' : 'text-gray-400'" />
              <p class="text-sm font-medium" :class="pricingMode === 'manual' ? 'text-primary-700' : 'text-gray-700'">
                Precio manual
              </p>
            </div>
            <p class="text-xs text-gray-500">
              Ingresá el precio de venta directamente por cada moneda.
            </p>
          </button>

          <button
            class="flex flex-col items-start p-4 rounded-lg border-2 transition-colors text-left"
            :class="pricingMode === 'from_costs' ? 'border-primary-500 bg-primary-50 dark:bg-primary-950' : 'border-default hover:border-default-hover'"
            @click="pricingMode = 'from_costs'"
          >
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-lucide-calculator" class="h-4 w-4" :class="pricingMode === 'from_costs' ? 'text-primary-600' : 'text-gray-400'" />
              <p class="text-sm font-medium" :class="pricingMode === 'from_costs' ? 'text-primary-700' : 'text-gray-700'">
                Desde costos
              </p>
            </div>
            <p class="text-xs text-gray-500">
              Calculado desde la estructura BOM (ingeniería + costos de materiales).
            </p>
          </button>
        </div>

        <div v-if="pricingMode === 'from_costs'" class="flex justify-end">
          <UButton size="sm" icon="i-lucide-arrow-right" variant="outline" @click="goToBom">
            Ir a BOM
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- EMPTY STATE -->
    <UCard v-else-if="!hasAnyData && !hasCalculatedCost">
      <div class="py-10 text-center space-y-3">
        <UIcon name="i-lucide-wallet" class="mx-auto h-10 w-10 text-gray-400" />
        <div>
          <p class="text-sm font-medium text-gray-900">Sin precios ni costos</p>
          <p class="text-sm text-gray-500 mt-1">
            <template v-if="hasVariants">Agregá el costo de cada variante del producto.</template>
            <template v-else-if="isFinishedProduct">Agregá el precio de venta del producto.</template>
            <template v-else>Este producto no tiene precios configurados.</template>
          </p>
        </div>
      </div>
    </UCard>

    <!-- COSTO CALCULADO (solo modo desde costos) -->
    <UCard v-if="hasCalculatedCost && pricingMode === 'from_costs'">
      <div class="flex items-center justify-between">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-calculator" class="h-4 w-4 text-gray-400" />
            <p class="text-sm font-medium text-gray-500">Costo calculado</p>
            <UBadge color="success" variant="soft" size="sm">Automático</UBadge>
          </div>
          <p class="text-2xl font-semibold">
            {{ formatMoney(product?.current_cost, latestProductCost?.currencies) }}
          </p>
          <p v-if="product?.last_cost_calculated_at" class="text-xs text-gray-400">
            Último cálculo: {{ new Date(product.last_cost_calculated_at).toLocaleString('es-AR') }}
          </p>
        </div>
        <UBadge color="neutral" variant="outline" size="lg">
          {{ latestProductCost?.currencies?.code ?? '' }}
        </UBadge>
      </div>
    </UCard>

    <!-- PRECIOS DEL PRODUCTO -->
    <UCard v-if="priceEnabled && existingProductPrices.length" :ui="{ body: 'p-0' }">
      <template #header>
        <div class="flex items-center gap-2 px-1">
          <p class="text-sm font-medium">Precios del producto</p>
          <UTooltip text="Precios de venta por moneda. Editá, eliminá o consultá el historial de cambios.">
            <UIcon name="i-lucide-help-circle" class="h-4 w-4 text-gray-400" />
          </UTooltip>
        </div>
      </template>

      <UTable
        :data="existingProductPrices"
        :columns="[
          { accessorKey: 'currencies', header: 'Moneda' },
          { accessorKey: 'price', header: 'Precio' },
          { accessorKey: 'exemption_rate', header: 'Exención IVA' },
          { accessorKey: 'updated_at', header: 'Última actualización' },
          { accessorKey: 'actions', header: '' }
        ]"
      >
        <template #currencies-cell="{ row }">
          <UBadge color="primary" variant="soft">
            {{ row.original.currencies?.code ?? '-' }}
          </UBadge>
        </template>

        <template #price-cell="{ row }">
          <span class="font-semibold">
            {{ formatMoney(row.original.price, row.original.currencies) }}
          </span>
        </template>

        <template #exemption_rate-cell="{ row }">
          <span class="text-sm">{{ row.original.exemption_rate ?? 0 }}%</span>
        </template>

        <template #updated_at-cell="{ row }">
          <span class="text-xs text-muted">
            {{ row.original.updated_at ? new Date(row.original.updated_at).toLocaleDateString('es-AR') : '—' }}
          </span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1 justify-end">
            <UTooltip text="Editar precio">
              <UButton
                icon="i-lucide-pencil"
                variant="ghost"
                size="xs"
                @click="openEditProductPriceModal(row.original)"
              />
            </UTooltip>
            <UTooltip text="Historial de cambios">
              <UButton icon="i-lucide-history" variant="ghost" size="xs" @click="openHistory(row.original.id)" />
            </UTooltip>
            <UTooltip text="Eliminar precio">
              <UButton
                icon="i-lucide-trash-2"
                variant="ghost"
                color="error"
                size="xs"
                @click="openDeletePriceConfirm(row.original.id)"
              />
            </UTooltip>
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- COSTOS DE VARIANTES -->
    <UCard v-if="priceEnabled && existingVariantCosts.length" :ui="{ body: 'p-0' }">
      <template #header>
        <p class="text-sm font-medium px-1">Costos por variante</p>
      </template>

      <UTable
        :data="existingVariantCosts"
        :columns="[
          { accessorKey: 'variant_name', header: 'Variante' },
          { accessorKey: 'cost', header: 'Costo' },
          { accessorKey: 'source', header: 'Origen' },
          { accessorKey: 'supplier', header: 'Proveedor' },
          { accessorKey: 'currency', header: 'Moneda' }
        ]"
      >
        <template #variant_name-cell="{ row }">
          <div>
            <p class="font-medium text-sm">{{ row.original.variant_name }}</p>
            <p v-if="row.original.variant_sku" class="text-xs text-gray-400">{{ row.original.variant_sku }}</p>
          </div>
        </template>

        <template #cost-cell="{ row }">
          <span class="font-semibold">
            {{ formatMoney(row.original.cost, row.original.currency) }}
          </span>
        </template>

        <template #source-cell="{ row }">
          <UBadge color="warning" variant="soft" size="sm">
            {{ SOURCE_LABELS[row.original.source] ?? row.original.source }}
          </UBadge>
        </template>

        <template #supplier-cell="{ row }">
          {{ row.original.supplier || '-' }}
        </template>

        <template #currency-cell="{ row }">
          <UBadge color="neutral" variant="soft" size="sm">
            {{ row.original.currency?.code ?? '-' }}
          </UBadge>
        </template>
      </UTable>
    </UCard>

    <!-- ========================= -->
    <!-- MODAL: PRECIO PRODUCTO    -->
    <!-- ========================= -->
    <UModal v-model:open="showProductPriceModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">{{ productPriceModalTitle }}</h3>
          </template>

          <div class="space-y-4">
            <UFormField label="Moneda" required>
              <UTooltip text="Moneda en la que se expresa el precio de venta">
                <template #text>Seleccioná la moneda para este precio</template>
                <USelect
                  v-model="productPriceForm.currency_id"
                  :items="currencyOptions"
                  placeholder="Seleccioná una moneda"
                  :disabled="isEditingPrice"
                />
              </UTooltip>
            </UFormField>

            <UFormField label="Precio" required>
              <UTooltip text="Precio de venta del producto en esta moneda">
                <template #text>Monto que el cliente paga por unidad</template>
                <UInputNumber v-model="productPriceForm.price" placeholder="0.00" :min="0" />
              </UTooltip>
            </UFormField>

            <UFormField label="Exención IVA (%)">
              <UTooltip text="Porcentaje de exención impositiva">
                <template #text>0 = sin exención (IVA completo), 100 = exento</template>
                <UInputNumber v-model="productPriceForm.exemption_rate" :min="0" :max="100" placeholder="0" />
              </UTooltip>
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" @click="showProductPriceModal = false">Cancelar</UButton>
              <UButton
                :loading="loadingProductPrice"
                :disabled="!productPriceForm.currency_id || !productPriceForm.price"
                @click="submitProductPrice"
              >
                {{ isEditingPrice ? 'Guardar cambios' : 'Guardar precio' }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- ========================= -->
    <!-- CONFIRM: ELIMINAR PRECIO  -->
    <!-- ========================= -->
    <UModal v-model:open="showDeletePriceConfirm">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Eliminar precio</h3>
          </template>

          <p class="text-sm text-gray-600">
            ¿Estás seguro de que deseas eliminar este precio? Esta acción no se puede deshacer.
          </p>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" @click="showDeletePriceConfirm = false">Cancelar</UButton>
              <UButton color="error" :loading="loadingDelete" @click="confirmDeletePrice">Eliminar</UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- ========================= -->
    <!-- MODAL: COSTO VARIANTE     -->
    <!-- ========================= -->
    <UModal v-model:open="showVariantCostModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Nuevo costo de variante</h3>
          </template>

          <div class="space-y-4">
            <UFormField label="Variante" required>
              <USelect
                v-model="variantCostForm.variant_id"
                :items="variantOptions"
                placeholder="Seleccioná una variante"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Moneda" required>
                <USelect v-model="variantCostForm.currency_id" :items="currencyOptions" placeholder="Moneda" />
              </UFormField>

              <UFormField label="Origen" required>
                <USelect v-model="variantCostForm.source" :items="sourceOptions" />
              </UFormField>
            </div>

            <UFormField label="Costo" required>
              <UInputNumber v-model="variantCostForm.cost" placeholder="0.00" :min="0" />
            </UFormField>

            <UFormField label="Proveedor">
              <UInput v-model="variantCostForm.supplier" placeholder="Nombre del proveedor" />
            </UFormField>

            <UFormField label="Notas">
              <UTextarea v-model="variantCostForm.notes" placeholder="Observaciones opcionales" />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" @click="showVariantCostModal = false">Cancelar</UButton>
              <UButton
                :loading="loadingVariantCost"
                :disabled="!variantCostForm.variant_id || !variantCostForm.currency_id || !variantCostForm.cost"
                @click="submitVariantCost"
              >
                Guardar costo
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- ========================= -->
    <!-- MODAL: HISTORIAL          -->
    <!-- ========================= -->
    <ProductPriceHistory
      v-model:open="showHistoryModal"
      :price-id="historyPriceId"
      :product-name="product?.name ?? ''"
    />
  </div>
</template>
