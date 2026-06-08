<script setup lang="ts">
import { computed } from 'vue'

import type { Currency } from '~/modulos/erp/currencies/types/currencies.types'
import type { Product } from '~/modulos/logistica/master-data/product/types/product.types'
import { PRODUCT_TYPE_LABELS } from '~/modulos/logistica/master-data/product/composable/product-labels'

const props = defineProps<{
  product?: Product | null
}>()

// =========================
// SAFE PRODUCT
// =========================

const product = computed(() => props.product)

// =========================
// TYPE
// =========================

const isRawMaterial = computed(
  () => product.value?.product_type === 'RAW_MATERIAL'
)

const productTypeLabel = computed(() => {
  if (!product.value?.product_type) {
    return '-'
  }

  return PRODUCT_TYPE_LABELS[product.value.product_type]
})

// =========================
// VARIANT COSTS
// =========================

const variantCosts = computed(
  () =>
    product.value?.product_variants?.flatMap((variant) =>
      (variant.productVariantCosts || []).map((cost) => ({
        variant_name: variant.name,
        ...cost
      }))
    ) || []
)

// =========================
// VARIANT PRICES
// =========================

const variantPrices = computed(
  () =>
    product.value?.product_variants?.flatMap((variant) =>
      (variant.productVariantPrices || []).map((price) => ({
        variant_name: variant.name,
        ...price
      }))
    ) || []
)

// =========================
// FORMAT MONEY
// =========================

const formatMoney = (
  value?: string | number | null,
  currency?: Currency | null
) => {
  if (value === null || value === undefined) {
    return '-'
  }

  return `${currency?.symbol || '$'} ${Number(value).toLocaleString()}`
}
</script>

<template>
  <div class="space-y-6">
    <!-- HEADER -->
    <UCard :ui="{ body: 'space-y-2' }">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold">Precio y costos</h2>
          <p class="text-sm text-gray-500">
            Información comercial y operativa del producto
          </p>
        </div>
        <UBadge :color="isRawMaterial ? 'warning' : 'primary'" variant="soft">
          {{ productTypeLabel }}
        </UBadge>
      </div>
    </UCard>

    <!-- COSTOS -->
    <UCard
      v-if="variantCosts.length"
      title="Costos de Variantes"
      :ui="{ body: 'p-0' }"
    >
      <UTable
        :data="variantCosts"
        :columns="[
          { accessorKey: 'variant_name', header: 'Variante' },
          { accessorKey: 'cost', header: 'Costo' },
          { accessorKey: 'currency', header: 'Moneda' },
          { accessorKey: 'source', header: 'Origen' },
          { accessorKey: 'supplier', header: 'Proveedor' },
          { accessorKey: 'effective_date', header: 'Fecha' }
        ]"
      >
        <template #cost-cell="{ row }">
          <div class="font-medium">
            {{ formatMoney(row.original.cost, row.original.currency) }}
          </div>
        </template>

        <template #currency-cell="{ row }">
          <UBadge color="neutral" variant="soft">
            {{ row.original.currency?.code }}
          </UBadge>
        </template>

        <template #source-cell="{ row }">
          <UBadge color="warning" variant="soft">
            {{ row.original.source }}
          </UBadge>
        </template>

        <template #supplier-cell="{ row }">
          {{ row.original.supplier || '-' }}
        </template>

        <template #effective_date-cell="{ row }">
          {{ new Date(row.original.effective_date).toLocaleDateString() }}
        </template>
      </UTable>
    </UCard>

    <!-- PRECIOS DEL PRODUCTO -->
    <UCard
      v-if="product?.product_price?.length"
      title="Precios del Producto"
      :ui="{ body: 'p-0' }"
    >
      <UTable
        :data="product?.product_price"
        :columns="[
          { accessorKey: 'price', header: 'Precio' },
          { accessorKey: 'exemption_rate', header: 'Exención' },
          { accessorKey: 'currencies', header: 'Moneda' }
        ]"
      >
        <!-- PRECIO -->
        <template #price-cell="{ row }">
          <div class="font-semibold">
            {{
              formatMoney(Number(row.original.price), row.original.currencies)
            }}
          </div>
        </template>

        <!-- EXENCIÓN -->
        <template #exemption_rate-cell="{ row }">
          {{ row.original.exemption_rate || 0 }}%
        </template>

        <!-- MONEDA -->
        <template #currencies-cell="{ row }">
          <UBadge color="primary" variant="soft">
            {{ row.original.currencies?.code }}
          </UBadge>
        </template>
      </UTable>
    </UCard>
    <!-- PRECIOS POR VARIANTE -->
    <UCard
      v-if="variantPrices.length"
      title="Precios por Variante"
      :ui="{ body: 'p-0' }"
    >
      <UTable
        :data="variantPrices"
        :columns="[
          { accessorKey: 'variant_name', header: 'Variante' },
          { accessorKey: 'price_list', header: 'Lista' },
          { accessorKey: 'price', header: 'Precio' },
          { accessorKey: 'margin', header: 'Margen' },
          { accessorKey: 'currency', header: 'Moneda' }
        ]"
      >
        <template #variant_name-cell="{ row }">
          <div class="font-medium">{{ row.original.variant_name }}</div>
        </template>

        <template #price_list-cell="{ row }">
          {{ row.original.price_list || 'General' }}
        </template>

        <template #price-cell="{ row }">
          <div class="font-semibold">
            {{ formatMoney(row.original.price, row.original.currency) }}
          </div>
        </template>

        <template #margin-cell="{ row }">
          {{ row.original.margin || '-' }}%
        </template>

        <template #currency-cell="{ row }">
          <UBadge color="success" variant="soft">
            {{ row.original.currency?.code }}
          </UBadge>
        </template>
      </UTable>
    </UCard>

    <!-- EMPTY -->
    <UCard
      v-if="
        !variantPrices.length &&
        !variantCosts.length &&
        !product?.product_price?.length
      "
    >
      <div class="py-10 text-center">
        <UIcon
          name="i-lucide-wallet"
          class="mx-auto mb-3 h-10 w-10 text-gray-400"
        />
        <h3 class="text-sm font-medium text-gray-900">
          No hay información de precios
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          Este producto todavía no tiene precios ni costos configurados.
        </p>
      </div>
    </UCard>
  </div>
</template>
