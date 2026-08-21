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

const columns = [
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
]
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center gap-3 flex-wrap">
      <span class="text-sm font-medium text-muted whitespace-nowrap">
        Agregar producto:
      </span>

      <USelectMenu
        v-model="selectedProduct"
        :items="props.productOptions"
        placeholder="Buscar por nombre..."
        searchable
        class="w-72"
      />

      <USelectMenu
        v-if="hasVariants && variantOptions.length > 0"
        v-model="selectedVariant"
        :items="variantOptions"
        placeholder="Seleccionar variante..."
        class="w-56"
      />

      <UButton
        icon="i-lucide-plus"
        :disabled="!selectedProduct"
        @click="handleAdd"
      >
        Agregar
      </UButton>
    </div>

    <UTable :data="props.items" :columns="columns" />
  </div>
</template>
