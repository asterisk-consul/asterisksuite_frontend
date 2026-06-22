<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'

import type { Product } from '~/modulos/logistica/master-data/product/types/product.types'
import type { Currency } from '~/modulos/erp/currencies/types/currencies.types'

import { useProductPriceStore } from '~/modulos/logistica/master-data/product-price/store/product-price.store'
import { useVariantCostsStore } from '~/modulos/logistica/master-data/variant-cost/store/variant-costs.store'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'

// =========================
// PROPS
// =========================

const props = defineProps<{
  product?: Product | null
}>()

// =========================
// STORES & COMPOSABLES
// =========================

const productPriceStore = useProductPriceStore()
const variantCostsStore = useVariantCostsStore()
const { selectItems: currencyOptions, init: initCurrencies, findById: findCurrency } = useCurrencies()
const toast = useToast()

// =========================
// COMPUTED
// =========================

const product = computed(() => props.product)

const isFinishedProduct = computed(() => product.value?.product_type === 'FINISHED_PRODUCT')

const hasVariants = computed(() => (product.value?.product_variants?.length ?? 0) > 0)

// Si tiene costo calculado, no se puede ingresar precio manual
const hasCalculatedCost = computed(() => !!product.value?.current_cost)

// El último product_cost (el más reciente = el que coincide con current_cost)
const latestProductCost = computed(() => {
  const costs = product.value?.product_costs
  if (!costs?.length) return null
  return costs[costs.length - 1]
})

// Se puede agregar precio manual solo si: es FINISHED_PRODUCT, sin variantes, y sin costo calculado
const canAddProductPrice = computed(() => isFinishedProduct.value && !hasVariants.value && !hasCalculatedCost.value)

// Precios existentes del producto
const existingProductPrices = computed(() => product.value?.product_price ?? [])

// Costos existentes por variante (aplanados)
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

// =========================
// FORMATTERS
// =========================

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
// MODAL: PRODUCT PRICE
// =========================

const showProductPriceModal = ref(false)
const loadingProductPrice = ref(false)

const productPriceForm = reactive({
  currency_id: '',
  price: undefined as number | undefined,
  exemption_rate: 0
})

const resetProductPriceForm = () => {
  productPriceForm.currency_id = ''
  productPriceForm.price = undefined
  productPriceForm.exemption_rate = 0
}

const openProductPriceModal = () => {
  resetProductPriceForm()
  showProductPriceModal.value = true
}

const submitProductPrice = async () => {
  if (!product.value?.id || !productPriceForm.currency_id || !productPriceForm.price) return

  try {
    loadingProductPrice.value = true
    await productPriceStore.create({
      product_id: product.value.id,
      currency_id: productPriceForm.currency_id,
      price: productPriceForm.price,
      exemption_rate: productPriceForm.exemption_rate
    })

    // Parchear el product local
    if (product.value) {
      product.value.product_price = [...(product.value.product_price ?? []), ...productPriceStore.items.slice(-1)]
    }

    toast.add({ title: 'Precio creado', color: 'success' })
    showProductPriceModal.value = false
  } catch (err: any) {
    const msg = err?.data?.message ?? 'Error desconocido'
    toast.add({ title: 'Error al crear precio', description: msg, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    loadingProductPrice.value = false
  }
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

    // Parchear la variante dentro del producto local
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

// =========================
// INIT
// =========================

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
        <UButton v-if="canAddProductPrice" icon="i-lucide-plus" size="sm" @click="openProductPriceModal">
          Agregar precio
        </UButton>

        <UButton v-if="hasVariants" icon="i-lucide-plus" size="sm" @click="openVariantCostModal">
          Agregar costo de variante
        </UButton>
      </div>
    </div>

    <!-- EMPTY STATE -->
    <UCard v-if="!hasAnyData && !hasCalculatedCost">
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

    <!-- COSTO CALCULADO -->
    <UCard v-if="hasCalculatedCost">
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
    <UCard v-if="existingProductPrices.length" :ui="{ body: 'p-0' }">
      <template #header>
        <p class="text-sm font-medium px-1">Precios del producto</p>
      </template>

      <UTable
        :data="existingProductPrices"
        :columns="[
          { accessorKey: 'price', header: 'Precio' },
          { accessorKey: 'exemption_rate', header: 'Exención IVA' },
          { accessorKey: 'currencies', header: 'Moneda' }
        ]"
      >
        <template #price-cell="{ row }">
          <span class="font-semibold">
            {{ formatMoney(row.original.price, row.original.currencies) }}
          </span>
        </template>

        <template #exemption_rate-cell="{ row }">{{ row.original.exemption_rate ?? 0 }}%</template>

        <template #currencies-cell="{ row }">
          <UBadge color="primary" variant="soft">
            {{ row.original.currencies?.code ?? '-' }}
          </UBadge>
        </template>
      </UTable>
    </UCard>

    <!-- COSTOS DE VARIANTES -->
    <UCard v-if="existingVariantCosts.length" :ui="{ body: 'p-0' }">
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
            <h3 class="text-lg font-semibold">Nuevo precio</h3>
          </template>

          <div class="space-y-4">
            <UFormField label="Moneda" required>
              <USelect
                v-model="productPriceForm.currency_id"
                :items="currencyOptions"
                placeholder="Seleccioná una moneda"
              />
            </UFormField>

            <UFormField label="Precio" required>
              <UInputNumber v-model="productPriceForm.price" placeholder="0.00" :min="0" />
            </UFormField>

            <UFormField label="Exención IVA (%)">
              <UInputNumber v-model="productPriceForm.exemption_rate" :min="0" :max="100" placeholder="0" />
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
                Guardar precio
              </UButton>
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
  </div>
</template>
