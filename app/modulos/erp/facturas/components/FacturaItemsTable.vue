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
    purchase_unit_id?: string | null
    purchase_to_stock_factor?: number
  }[]

  currencyCode?: string
  warehouses?: { value: string, label: string }[]
  showWarehouseColumn?: boolean
  defaultWarehouseId?: string | null
  warehouseOptionsForItem?: (item: FacturaItem) => { value: string, label: string }[]
  showAmounts?: boolean
  canRegularizeStock?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currencyCode: 'ARS'
})

const emit = defineEmits<{
  remove: [index: number]

  add: [product: any]

  'update:warehouse': [index: number, warehouseId: string | null]
  'regularize-stock': [index: number, item: FacturaItem]
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
  const discount = Math.min(100, Math.max(0, Number(item.discount_percentage || 0)))
  item.discount_percentage = discount
  item.subtotal = Number(
    (Number(item.quantity || 0) * Number(item.unit_price || 0) * (1 - discount / 100)).toFixed(2)
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
    ...product,
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
const UTooltip = resolveComponent('UTooltip')

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
  ...(props.items.some(item => Number(item.unit_conversion_factor ?? 1) !== 1) ? [{
    id: 'stock_quantity',
    header: 'Ingreso a stock',
    cell: ({ row }: any) => {
      const factor = Number(row.original.unit_conversion_factor || 1)
      const stockQuantity = Number(row.original.quantity || 0) * factor
      row.original.stock_quantity = stockQuantity
      return h('div', { class: 'text-right' }, [
        h('p', { class: 'font-medium tabular-nums' }, stockQuantity.toLocaleString('es-AR')),
        h('p', { class: 'text-xs text-muted' }, `factor × ${factor.toLocaleString('es-AR')}`)
      ])
    }
  }] : []),
  ...(props.showWarehouseColumn ? [{
    accessorKey: 'warehouse_id',
    header: 'Depósito',
    cell: ({ row }: any) => {
      const options = props.warehouseOptionsForItem?.(row.original) ?? props.warehouses ?? []
      const selectedWarehouseId = row.original.warehouse_id || props.defaultWarehouseId || undefined
      const selectedWarehouse = options.find(option => option.value === selectedWarehouseId)
      const tooltipText = selectedWarehouse?.label
        || (options.length ? 'Seleccioná el depósito de salida' : 'Este producto no tiene un depósito con stock suficiente')
      return h('div', { class: 'flex w-48 items-center gap-1.5' }, [
        h('div', { class: 'min-w-0 flex-1' }, [
          h(UTooltip, { text: tooltipText, delayDuration: 250 }, {
            default: () => h(USelect, {
              modelValue: selectedWarehouseId,
              items: options,
              valueKey: 'value',
              placeholder: options.length ? 'Seleccionar depósito' : 'Sin stock suficiente',
              disabled: options.length === 0,
              size: 'sm',
              class: 'w-full min-w-0',
              'aria-label': tooltipText,
              'onUpdate:modelValue': (value: string | { value?: string }) => {
                const warehouseId = typeof value === 'string' ? value : value?.value ?? null
                row.original.warehouse_id = warehouseId
                emit('update:warehouse', row.index, warehouseId)
              }
            })
          })
        ]),
        ...(options.length === 0
          ? [props.canRegularizeStock
              ? h(UButton, {
                  icon: 'i-lucide-package-plus',
                  size: 'xs',
                  variant: 'soft',
                  square: true,
                  title: 'Regularizar stock en un depósito',
                  'aria-label': 'Regularizar stock',
                  onClick: () => emit('regularize-stock', row.index, row.original)
                })
              : h('span', {
                  class: 'shrink-0 text-warning',
                  title: 'No hay stock suficiente. Solicitá la regularización a un responsable.'
                }, [h(resolveComponent('UIcon'), { name: 'i-lucide-circle-alert', class: 'size-4' })])]
          : [])
      ])
    }
  }] : []),
  ...(props.showAmounts === false ? [] : [{
    accessorKey: 'unit_price',
    header: 'Precio unitario',
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
    accessorKey: 'discount_percentage',
    header: 'Bonif. %',
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right'
      }
    },
    cell: ({ row }: any) => h(UInput, {
      modelValue: row.original.discount_percentage ?? 0,
      type: 'number',
      min: 0,
      max: 100,
      step: '0.01',
      class: 'w-24',
      'aria-label': 'Bonificación porcentual',
      'onUpdate:modelValue': (val: number) => {
        row.original.discount_percentage = Number(val || 0)
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
  }]),
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
  <div class="space-y-4">
    <div class="rounded-xl border border-default bg-muted/30 p-4">
      <div class="mb-4 flex items-start gap-3">
        <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UIcon name="i-lucide-package-plus" class="size-5" />
        </div>
        <div>
          <p class="font-medium">Agregar productos</p>
          <p class="text-sm text-muted">Buscá un artículo, elegí su variante si corresponde y agregalo al comprobante.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,0.55fr)_auto] lg:items-end">
        <UFormField label="Producto" class="min-w-0">
          <USelectMenu
            v-model="selectedProduct"
            :items="props.productOptions"
            value-key="value"
            placeholder="Buscar por código o nombre..."
            searchable
            class="w-full min-w-0"
          />
        </UFormField>

        <UFormField v-if="hasVariants && variantOptions.length > 0" label="Variante" class="min-w-0">
          <USelectMenu
            v-model="selectedVariant"
            :items="variantOptions"
            value-key="value"
            placeholder="Seleccionar variante..."
            class="w-full min-w-0"
          />
        </UFormField>

        <UButton
          icon="i-lucide-plus"
          label="Agregar producto"
          size="lg"
          class="w-full justify-center lg:w-auto"
          :disabled="!selectedProduct || (hasVariants && variantOptions.length > 0 && !selectedVariant)"
          @click="handleAdd"
        />
      </div>
    </div>

    <div class="w-full overflow-x-auto rounded-lg border border-default">
      <UTable :data="props.items" :columns="columns" class="min-w-[900px]" />
      <div v-if="props.items.length === 0" class="border-t border-default px-4 py-10 text-center">
        <UIcon name="i-lucide-shopping-basket" class="mx-auto mb-2 size-8 text-muted" />
        <p class="font-medium">Todavía no agregaste productos</p>
        <p class="mt-1 text-sm text-muted">El subtotal y los impuestos se calcularán automáticamente.</p>
      </div>
    </div>
  </div>
</template>
