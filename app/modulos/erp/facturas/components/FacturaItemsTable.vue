<script setup lang="ts">
import { h, resolveComponent, ref, watch, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'

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
    variants?: { id: string, name?: string | null, sku?: string | null, active?: boolean }[]
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
  isPurchaseDocument?: boolean
  lockPurchaseAdjustments?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currencyCode: 'ARS'
})

const emit = defineEmits<{
  remove: [index: number]

  add: [product: any]

  'update:warehouse': [index: number, warehouseId: string | null]
  'regularize-stock': [index: number, item: FacturaItem]
  'search-products': [query: string]
}>()

const selectedProduct = ref<any>(null)
const productPickerRoot = ref<HTMLElement | null>(null)
const productPickerOpen = ref(false)
const productSearch = ref('')
function focusProductPicker() {
  productPickerOpen.value = true
  void nextTick(() => {
    const trigger = productPickerRoot.value?.querySelector<HTMLElement>('button, [role="combobox"]')
    trigger?.scrollIntoView({ block: 'nearest' })
    trigger?.focus()

    // USelectMenu monta la búsqueda en un popover teletransportado al body.
    // Esperamos un tick adicional para que exista antes de enfocarla.
    void nextTick(() => {
      const searchInput = document.querySelector<HTMLInputElement>(
        '[cmdk-input], input[role="combobox"], input[aria-autocomplete="list"]'
      )
      searchInput?.focus()
    })
  })
}

function handleProductShortcut(event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing) return

  if (event.key === 'F2' && !event.altKey && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    focusProductPicker()
    return
  }

  if (event.key === 'Enter' && event.ctrlKey && !event.altKey && !event.metaKey) {
    event.preventDefault()
    event.stopPropagation()
    handleAdd()
  }
}

onMounted(() => window.addEventListener('keydown', handleProductShortcut, true))
onBeforeUnmount(() => window.removeEventListener('keydown', handleProductShortcut, true))
watch(productSearch, query => emit('search-products', query))
const visibleProductOptions = computed(() => {
  const query = productSearch.value.trim().toLocaleLowerCase('es-AR')
  const matches = query
    ? props.productOptions.filter(option => option.label.toLocaleLowerCase('es-AR').includes(query))
    : props.productOptions
  const selected = props.productOptions.find(option => option.value === selectedProduct.value)
  const options = selected && !matches.some(option => option.value === selected.value)
    ? [selected, ...matches]
    : matches
  return options.slice(0, 100)
})
const selectedVariant = ref<string | null>(null)
const variantOptions = ref<any[]>([])
const variantLoading = ref(false)
const variantLoadError = ref<string | null>(null)
const variantLabels = ref<Record<string, string>>({})
const { loadByProduct: loadVariants } = useProductVariants()

const selectedProductData = computed(() => {
  if (!selectedProduct.value) return null
  return props.productOptions.find(p => p.value === selectedProduct.value)
})

const hasVariants = computed(() => {
  const product = selectedProductData.value
  return product?.has_variants === true
})

watch(selectedProduct, async (productId) => {
  selectedVariant.value = null
  variantOptions.value = []
  variantLoadError.value = null

  if (!productId) return

  const product = selectedProductData.value
  if (product?.has_variants) {
    variantLoading.value = true
    try {
      const variants = product.variants?.length ? product.variants : await loadVariants(productId)
      variantOptions.value = variants
        .filter(variant => variant.active !== false && typeof variant.name === 'string' && variant.name.trim())
        .map(variant => ({
          label: variant.sku ? `${variant.sku} - ${variant.name}` : variant.name!,
          value: variant.id
        }))
      for (const option of variantOptions.value) variantLabels.value[option.value] = option.label
      if (variantOptions.value.length === 1) selectedVariant.value = variantOptions.value[0].value
      if (variantOptions.value.length === 0) {
        variantLoadError.value = 'El producto está configurado con variantes, pero no tiene ninguna variante activa.'
      }
    } catch (error: any) {
      variantOptions.value = []
      variantLoadError.value = error?.data?.message || 'No se pudieron cargar las variantes del producto.'
    } finally {
      variantLoading.value = false
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
  const calculatedSubtotal = Number(item.quantity || 0) * Number(item.unit_price || 0) * (1 - discount / 100)
  item.subtotal = Number((item.subtotal_override ?? item.net_subtotal_override ?? calculatedSubtotal).toFixed(2))

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

function originalLineAmount(item: FacturaItem) {
  return Number(item.quantity || 0) * Number(item.original_unit_price ?? item.unit_price ?? 0)
}

function includedTaxFactor(item: FacturaItem) {
  const includedRates = (item.taxes ?? [])
    .filter(tax => tax.is_included_in_price)
    .map(tax => Number(tax.tax_rate ?? 0))
  return Math.max(0.000001, 1 - includedRates.reduce((sum, rate) => sum + rate / (100 + rate), 0))
}

function setPurchaseNetAmount(item: FacturaItem, netAmount: number) {
  const factor = includedTaxFactor(item)
  const rawLineAmount = netAmount / factor
  item.subtotal_override = netAmount
  item.net_subtotal_override = rawLineAmount
  item.discount_amount_override = Math.max(0, originalLineAmount(item) - rawLineAmount)
  recalculateItem(item)
}

function setPurchaseDiscountAmount(item: FacturaItem, value: unknown) {
  if (value == null || value === '') {
    item.discount_amount_override = null
    item.subtotal_override = null
    item.net_subtotal_override = null
    recalculateItem(item)
    return
  }
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) {
    item.discount_amount_override = null
    item.subtotal_override = null
    item.net_subtotal_override = null
  } else {
    const gross = originalLineAmount(item)
    item.discount_amount_override = Math.min(gross, amount)
    const rawLineAmount = Math.max(0, gross - item.discount_amount_override)
    item.net_subtotal_override = rawLineAmount
    item.subtotal_override = rawLineAmount * includedTaxFactor(item)
  }
  recalculateItem(item)
}

function handleAdd() {
  if (!selectedProduct.value || (hasVariants.value && !selectedVariant.value)) {
    return
  }

  const product = selectedProductData.value
  const variantName = selectedVariant.value
    ? variantOptions.value.find(option => option.value === selectedVariant.value)?.label ?? null
    : null
  emit('add', {
    ...product,
    product_id: selectedProduct.value,
    variant_id: selectedVariant.value || null,
    variant_name: variantName,
    product_name: product?.label,
    has_variants: product?.has_variants
  })

  selectedProduct.value = null
  selectedVariant.value = null
  productSearch.value = ''
  focusProductPicker()
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
      const label = row.original.variant_name || variantLabels.value[row.original.variant_id]
      return h('span', { class: 'text-sm' }, label ?? 'Variante seleccionada')
    }
  },
  {
    accessorKey: 'quantity',
    header: 'Cantidad',
    size: 150,
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right min-w-36'
      }
    },
    cell: ({ row }: any) =>
      h(UInput, {
        modelValue: row.original.quantity,
        type: 'number',
        min: 0,
        step: 1,
        size: 'lg',
        class: 'ml-auto w-32 text-right font-medium tabular-nums',
        'aria-label': `Cantidad de ${row.original.product_name || 'producto'}`,
        'onUpdate:modelValue': (val: number) => {
          const savedDiscountAmount = row.original.discount_amount_override
          row.original.quantity = Number(val || 0)
          if (props.lockPurchaseAdjustments && savedDiscountAmount != null) {
            setPurchaseDiscountAmount(row.original, savedDiscountAmount)
          } else {
            row.original.net_subtotal_override = null
            row.original.subtotal_override = null
            row.original.discount_amount_override = null
            recalculateItem(row.original)
          }
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
    size: 190,
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right min-w-48'
      }
    },
    cell: ({ row }: any) =>
      h(UInput, {
        modelValue: row.original.unit_price,
        type: 'number',
        min: 0,
        step: '0.01',
        size: 'lg',
        class: 'ml-auto w-40 text-right font-semibold tabular-nums',
        'aria-label': `Precio unitario de ${row.original.product_name || 'producto'}`,
        'onUpdate:modelValue': (val: number) => {
          const savedDiscountAmount = row.original.discount_amount_override
          row.original.unit_price = Number(val || 0)
          row.original.original_unit_price = row.original.unit_price
          if (props.lockPurchaseAdjustments && savedDiscountAmount != null) {
            setPurchaseDiscountAmount(row.original, savedDiscountAmount)
          } else {
            row.original.net_subtotal_override = null
            row.original.subtotal_override = null
            row.original.discount_amount_override = null
            recalculateItem(row.original)
          }
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
      disabled: props.lockPurchaseAdjustments,
      'aria-label': 'Bonificación porcentual',
      'onUpdate:modelValue': (val: number) => {
        row.original.discount_percentage = Number(val || 0)
        row.original.net_subtotal_override = null
        row.original.subtotal_override = null
        row.original.discount_amount_override = null
        recalculateItem(row.original)
      }
    })
  },
  ...(props.isPurchaseDocument ? [{
    accessorKey: 'discount_amount_override',
    header: 'Bonificación',
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right'
      }
    },
    cell: ({ row }: any) => props.lockPurchaseAdjustments
      ? h('div', { class: 'min-w-36 text-right' }, [
          h('p', { class: 'font-medium tabular-nums' }, fmt(Number(row.original.discount_amount_override ?? (originalLineAmount(row.original) * Number(row.original.discount_percentage ?? 0) / 100)))),
          h('p', { class: 'mt-1 text-xs text-muted' }, 'Conservada · bloqueada por conceptos')
        ])
      : h('div', { class: 'min-w-36' }, [
      h(UInput, {
        modelValue: row.original.discount_amount_override ?? (originalLineAmount(row.original) * Number(row.original.discount_percentage ?? 0) / 100),
        type: 'number',
        min: 0,
        max: originalLineAmount(row.original),
        step: '0.01',
        size: 'lg',
        class: 'w-36 text-right font-medium tabular-nums',
        'aria-label': `Importe de bonificación de ${row.original.product_name || 'producto'}`,
        'onUpdate:modelValue': (value: number) => setPurchaseDiscountAmount(row.original, value)
      }),
      h('p', { class: 'mt-1 text-xs text-muted' }, row.original.discount_amount_override != null ? 'Importe ingresado' : 'Calculada por porcentaje')
    ])
  }] : []),
  {
    accessorKey: 'subtotal',
    header: props.isPurchaseDocument ? 'Subtotal neto' : 'Subtotal',
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right'
      }
    },
    cell: ({ row }: any) => props.isPurchaseDocument && !props.lockPurchaseAdjustments
      ? h('div', { class: 'min-w-36' }, [
          h(UInput, {
            modelValue: row.original.subtotal_override ?? row.original.subtotal ?? 0,
            type: 'number',
            min: 0,
            step: '0.01',
            size: 'lg',
            class: 'w-36 text-right font-semibold tabular-nums',
            'aria-label': `Subtotal neto de ${row.original.product_name || 'producto'}`,
            'onUpdate:modelValue': (value: number | string) => {
              if (value == null || value === '') {
                row.original.subtotal_override = null
                row.original.net_subtotal_override = null
                row.original.discount_amount_override = null
                recalculateItem(row.original)
                return
              }
              const amount = Number(value)
              if (Number.isFinite(amount) && amount >= 0) setPurchaseNetAmount(row.original, amount)
            }
          }),
          h('p', { class: 'mt-1 text-xs text-muted' }, row.original.subtotal_override != null ? 'Importe ingresado' : 'Calculado')
        ])
      : props.isPurchaseDocument && props.lockPurchaseAdjustments
        ? h('div', { class: 'min-w-36 text-right' }, [
            h('p', { class: 'font-medium tabular-nums' }, fmt(Number(row.original.subtotal || 0))),
            h('p', { class: 'mt-1 text-xs text-muted' }, 'Neto luego de conceptos')
          ])
        : fmt(Number(row.original.subtotal || 0))
  },
  {
    accessorKey: 'total_taxes',
    header: 'Impuestos',
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right min-w-36'
      }
    },
    cell: ({ row }: any) => h('div', { class: 'text-right' }, [
      h('p', { class: 'font-medium tabular-nums' }, fmt(Number(row.original.total_taxes || 0))),
      ...(row.original.taxes ?? []).map((tax: any) => h('p', { class: 'text-xs text-muted' }, `${tax.name || tax.code || 'Impuesto'} ${Number(tax.tax_rate || 0)}%`))
    ])
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
  <div class="flex flex-col gap-4">
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

      <div
        class="grid grid-cols-1 gap-3 lg:items-end"
        :class="hasVariants
          ? 'lg:grid-cols-[minmax(0,1fr)_minmax(14rem,0.55fr)_auto]'
          : 'lg:grid-cols-[minmax(0,1fr)_auto]'"
      >
        <UFormField label="Producto" class="min-w-0">
          <div ref="productPickerRoot">
          <USelectMenu
            v-model:open="productPickerOpen"
            v-model="selectedProduct"
            :items="visibleProductOptions"
            value-key="value"
            label-key="label"
            placeholder="Buscar por código o nombre..."
            searchable
            v-model:search-term="productSearch"
            class="w-full min-w-0"
          />
          </div>
        </UFormField>

        <UFormField v-if="hasVariants" label="Variante" required class="min-w-0">
          <USelectMenu
            v-model="selectedVariant"
            :items="variantOptions"
            value-key="value"
            :placeholder="variantLoading ? 'Cargando variantes...' : 'Seleccionar variante...'"
            :loading="variantLoading"
            :disabled="variantLoading || !!variantLoadError"
            class="w-full min-w-0"
          />
          <p v-if="variantLoadError" class="mt-1 text-xs text-error">{{ variantLoadError }}</p>
        </UFormField>

        <UButton
          icon="i-lucide-plus"
          label="Agregar producto"
          size="lg"
          class="w-full justify-center lg:w-auto"
          :disabled="!selectedProduct || variantLoading || (hasVariants && (!selectedVariant || !!variantLoadError))"
          @click="handleAdd"
        >
          <template #trailing>
            <KeyboardShortcutHint :keys="['Ctrl', '↵']" />
          </template>
        </UButton>
      </div>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span class="inline-flex items-center gap-1.5"><KeyboardShortcutHint :keys="['F2']" /> abre el selector</span>
        <span class="inline-flex items-center gap-1.5"><KeyboardShortcutHint :keys="['Tab']" /> recorre los campos</span>
        <span class="inline-flex items-center gap-1.5"><KeyboardShortcutHint :keys="['Ctrl', '↵']" /> agrega el producto</span>
      </div>
    </div>

    <div class="w-full overflow-x-auto rounded-lg border border-default">
      <UTable :data="props.items" :columns="columns" class="min-w-[1080px]" />
      <div v-if="props.items.length === 0" class="border-t border-default px-4 py-10 text-center">
        <UIcon name="i-lucide-shopping-basket" class="mx-auto mb-2 size-8 text-muted" />
        <p class="font-medium">Todavía no agregaste productos</p>
        <p class="mt-1 text-sm text-muted">El subtotal y los impuestos se calcularán automáticamente.</p>
      </div>
    </div>
  </div>
</template>
