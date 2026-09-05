<script setup lang="ts">
import { h, resolveComponent, ref, watch, computed } from 'vue'

import type { FacturaItem } from '../types/factura.types'
import { useProductVariants } from '~/modulos/logistica/master-data/product-variants/composable/useVariants'

interface Props {
  items: FacturaItem[]

  productOptions: {
    value: string

    label: string

    price?: number

    taxes?: any[]

    product_type?: string

    has_variants?: boolean
  }[]

  currencyCode?: string
  warehouses?: { value: string, label: string }[]
  showWarehouseColumn?: boolean
  defaultWarehouseId?: string | null
  warehouseOptionsForItem?: (item: FacturaItem) => { value: string, label: string }[]
}

const props = withDefaults(defineProps<Props>(), {
  currencyCode: 'ARS'
})

const emit = defineEmits<{
  remove: [index: number]

  add: [product: any]
}>()

const selectedProduct = ref<any>(null)
const selectedVariant = ref<string | null>(null)
const variantOptions = ref<any[]>([])
const { selectItems: variantSelectItems, loadByProduct: loadVariants } = useProductVariants()

const selectedProductData = computed(() => {
  if (!selectedProduct.value) return null
  return props.productOptions.find(p => p.value === selectedProduct.value)
})

const hasVariants = computed(() => {
  const product = selectedProductData.value
  return product?.has_variants === true || product?.product_type === 'RAW_MATERIAL'
})

watch(selectedProduct, async (productId) => {
  selectedVariant.value = null
  variantOptions.value = []

  if (!productId) return

  const product = selectedProductData.value
  if (product?.has_variants || product?.product_type === 'RAW_MATERIAL') {
    try {
      await loadVariants(productId)
      variantOptions.value = variantSelectItems.value
    } catch {
      variantOptions.value = []
    }
  }
})

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',

    currency: props.currencyCode
  }).format(Number(n || 0))
}

function recalculateItem(item: FacturaItem) {
  item.subtotal = Number(
    (Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)
  )

  item.taxes = (item.taxes ?? []).map((tax) => {
    const subtotal = Number(item.subtotal || 0)

    const taxAmount = tax.is_included_in_price
      ? 0
      : subtotal * (Number(tax.tax_rate || 0) / 100)

    return {
      ...tax,
      tax_amount: Number(taxAmount.toFixed(2))
    }
  })

  item.total_taxes = item.taxes.reduce(
    (acc, tax) => acc + Number(tax.tax_amount || 0),
    0
  )

  item.total = Number((item.subtotal + item.total_taxes).toFixed(2))
}

function handleAdd() {
  if (!selectedProduct.value) {
    return
  }

  const product = selectedProductData.value
  emit('add', {
    product_id: selectedProduct.value,
    variant_id: selectedVariant.value || null,
    product_name: product?.label,
    has_variants: product?.has_variants
  })

  selectedProduct.value = null
  selectedVariant.value = null
}

const UInput = resolveComponent('UInput')

const UButton = resolveComponent('UButton')
const USelect = resolveComponent('USelect')

const columns = computed(() => [
  {
    accessorKey: 'product_name',
    header: 'Producto'
  },
  {
    accessorKey: 'variant_id',
    header: 'Variante',
    cell: ({ row }: any) => {
      if (!row.original.variant_id) return h('span', { class: 'text-muted text-sm' }, '-')
      const variant = variantOptions.value.find(v => v.value === row.original.variant_id)
      return h('span', { class: 'text-sm' }, variant?.label ?? row.original.variant_id)
    }
  },
  {
    accessorKey: 'quantity',
    header: 'Cantidad',
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right'
      }
    },
    cell: ({ row }: any) =>
      h(UInput, {
        modelValue: row.original.quantity,
        type: 'number',
        min: 0,
        step: 1,
        'onUpdate:modelValue': (val: number) => {
          row.original.quantity = Number(val || 0)
          recalculateItem(row.original)
        }
      })
  },
  ...(props.showWarehouseColumn ? [{
    accessorKey: 'warehouse_id',
    header: 'Depósito',
    cell: ({ row }: any) => h(USelect, {
      modelValue: row.original.warehouse_id || props.defaultWarehouseId || undefined,
      items: props.warehouseOptionsForItem?.(row.original) ?? props.warehouses ?? [],
      placeholder: 'Seleccionar depósito',
      class: 'min-w-48',
      'onUpdate:modelValue': (value: string) => { row.original.warehouse_id = value }
    })
  }] : []),
  {
    accessorKey: 'unit_price',
    header: 'Precio Unitario',
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right'
      }
    },
    cell: ({ row }: any) =>
      h(UInput, {
        modelValue: row.original.unit_price,
        type: 'number',
        min: 0,
        step: '0.01',
        'onUpdate:modelValue': (val: number) => {
          row.original.unit_price = Number(val || 0)
          recalculateItem(row.original)
        }
      })
  },
  {
    accessorKey: 'subtotal',
    header: 'Subtotal',
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right'
      }
    },
    cell: ({ row }: any) => fmt(Number(row.original.subtotal || 0))
  },
  {
    accessorKey: 'total',
    header: 'Total',
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right'
      }
    },
    cell: ({ row }: any) => fmt(Number(row.original.total || 0))
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }: any) =>
      h(UButton, {
        color: 'error',
        variant: 'soft',
        icon: 'i-lucide-trash',
        onClick: () => emit('remove', row.index)
      })
  }
])
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[auto_minmax(18rem,1fr)_minmax(14rem,0.65fr)_auto] xl:items-end">
      <span class="text-sm font-medium text-muted whitespace-nowrap xl:pb-2.5">
        Agregar producto:
      </span>

      <USelectMenu
        v-model="selectedProduct"
        :items="props.productOptions"
        value-key="value"
        placeholder="Buscar por nombre..."
        searchable
        class="w-full min-w-0"
      />

      <USelectMenu
        v-if="hasVariants && variantOptions.length > 0"
        v-model="selectedVariant"
        :items="variantOptions"
        value-key="value"
        placeholder="Seleccionar variante..."
        class="w-full min-w-0 sm:col-span-1"
      />

      <UButton
        icon="i-lucide-plus"
        label="Agregar"
        class="w-full justify-center sm:w-auto"
        :disabled="!selectedProduct"
        @click="handleAdd"
      />
    </div>

    <div class="w-full overflow-x-auto rounded-lg border border-default">
      <UTable :data="props.items" :columns="columns" class="min-w-[760px]" />
    </div>
  </div>
</template>
