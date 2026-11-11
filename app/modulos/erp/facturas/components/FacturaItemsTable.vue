<script setup lang="ts">
import { h, resolveComponent, ref, watch, computed, reactive } from 'vue'

import type { FacturaItem } from '../types/factura.types'
import ProductPickerField from '~/components/erp/products/ProductPickerField.vue'
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
    categories?: { id: string, name: string }[]
    tags?: { id: string, name: string }[]
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
  priceInputIncludesTaxes?: boolean
  allowItemInstructions?: boolean
  addingProducts?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currencyCode: 'ARS',
  addingProducts: false
})

const emit = defineEmits<{
  remove: [index: number]

  'add-many': [products: any[]]

  'update:warehouse': [index: number, warehouseId: string | null]
  'regularize-stock': [index: number, item: FacturaItem]
  'search-products': [query: string]
}>()

const selectedProductIds = ref<string[]>([])
const productSearch = ref('')
watch(productSearch, query => emit('search-products', query))
const selectedVariants = ref<Record<string, string>>({})
const variantOptionsByProduct = ref<Record<string, any[]>>({})
const variantLoadingIds = reactive(new Set<string>())
const variantErrors = ref<Record<string, string>>({})
const { loadByProduct: loadVariants } = useProductVariants()

const selectedProductsData = computed(() => selectedProductIds.value
  .map(productId => props.productOptions.find(product => product.value === productId))
  .filter((product): product is NonNullable<typeof product> => Boolean(product)))

const selectedVariantProducts = computed(() => selectedProductsData.value.filter(product => product.has_variants))
const hasVariants = computed(() => selectedVariantProducts.value.length > 0)
const variantLoading = computed(() => selectedVariantProducts.value.some(product => variantLoadingIds.has(product.value)))
const hasVariantSelectionError = computed(() => selectedVariantProducts.value.some(product =>
  !selectedVariants.value[product.value] || Boolean(variantErrors.value[product.value])
))

watch(selectedProductIds, async (productIds) => {
  const activeIds = new Set(productIds)
  selectedVariants.value = Object.fromEntries(Object.entries(selectedVariants.value).filter(([id]) => activeIds.has(id)))
  variantErrors.value = Object.fromEntries(Object.entries(variantErrors.value).filter(([id]) => activeIds.has(id)))

  const productsToLoad = selectedProductsData.value.filter(product =>
    product.has_variants && !variantOptionsByProduct.value[product.value]?.length && !variantLoadingIds.has(product.value)
  )
  await Promise.all(productsToLoad.map(async (product) => {
    const productId = product.value
    variantLoadingIds.add(productId)
    try {
      const variants = product.variants?.length ? product.variants : await loadVariants(productId)
      const options = variants
        .filter(variant => variant.active !== false && typeof variant.name === 'string' && variant.name.trim())
        .map(variant => ({
          label: variant.sku ? `${variant.sku} - ${variant.name}` : variant.name!,
          value: variant.id
        }))
      variantOptionsByProduct.value = { ...variantOptionsByProduct.value, [productId]: options }
      if (options.length === 1) selectedVariants.value = { ...selectedVariants.value, [productId]: options[0].value }
      if (options.length === 0) variantErrors.value = {
        ...variantErrors.value,
        [productId]: 'El producto está configurado con variantes, pero no tiene ninguna variante activa.'
      }
    } catch (error: any) {
      variantOptionsByProduct.value = { ...variantOptionsByProduct.value, [productId]: [] }
      variantErrors.value = { ...variantErrors.value, [productId]: error?.data?.message || 'No se pudieron cargar las variantes del producto.' }
    }
    finally { variantLoadingIds.delete(productId) }
  }))
}, { deep: true })

function variantOptionsFor(productId: string) {
  return variantOptionsByProduct.value[productId] ?? []
}

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

function grossPriceFactor(item: FacturaItem) {
  const additionalTaxRate = (item.taxes ?? [])
    .filter(tax => !tax.is_included_in_price)
    .reduce((sum, tax) => sum + Number(tax.tax_rate || 0), 0)
  return Math.max(1, 1 + additionalTaxRate / 100)
}

function displayedUnitPrice(item: FacturaItem) {
  const amount = Number(item.unit_price || 0) * (props.priceInputIncludesTaxes ? grossPriceFactor(item) : 1)
  return Number(amount.toFixed(2))
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
  if (!selectedProductIds.value.length || hasVariantSelectionError.value || variantLoading.value) return

  const products = selectedProductsData.value.map((product) => {
    const variantId = selectedVariants.value[product.value] ?? null
    const variantName = variantId
      ? variantOptionsFor(product.value).find(option => option.value === variantId)?.label ?? null
      : null
    return {
      ...product,
      product_id: product.value,
      variant_id: variantId,
      variant_name: variantName,
      product_name: product.label,
      has_variants: product.has_variants
    }
  })

  emit('add-many', products)
  selectedProductIds.value = []
  selectedVariants.value = {}
  productSearch.value = ''
}

const UInput = resolveComponent('UInput')
const UTextarea = resolveComponent('UTextarea')

const UButton = resolveComponent('UButton')
const USelect = resolveComponent('USelect')
const UTooltip = resolveComponent('UTooltip')

const columns = computed(() => [
  {
    accessorKey: 'product_name',
    header: 'Producto',
    cell: ({ row }: any) => {
      const item = row.original as FacturaItem
      const instructions = String(item.item_instructions ?? '').trim()
      const expanded = item.instructions_expanded === true

      return h('div', { class: 'min-w-52 py-1' }, [
        h('p', { class: 'font-medium' }, item.product_name || 'Producto'),
        ...(props.allowItemInstructions
          ? [
              h(UButton, {
                type: 'button',
                size: 'xs',
                variant: 'ghost',
                color: 'primary',
                icon: expanded ? 'i-lucide-chevron-up' : instructions ? 'i-lucide-pencil' : 'i-lucide-ruler',
                class: 'mt-1 -ml-2',
                'aria-expanded': expanded,
                'aria-label': `${expanded ? 'Ocultar' : instructions ? 'Editar' : 'Agregar'} medidas e indicaciones de ${item.product_name || 'producto'}`,
                onClick: () => { item.instructions_expanded = !expanded }
              }, () => expanded
                ? 'Ocultar medidas e indicaciones'
                : instructions
                  ? 'Editar medidas e indicaciones'
                  : 'Agregar medidas e indicaciones'),
              ...(expanded
                ? [h(UTextarea, {
                    modelValue: item.item_instructions ?? '',
                    rows: 2,
                    maxlength: 1000,
                    autoresize: true,
                    placeholder: 'Largo 120 cm, ancho 80 cm; perforaciones a 10 cm',
                    class: 'mt-1 min-w-64',
                    'aria-label': `Medidas e indicaciones de ${item.product_name || 'producto'}`,
                    'onUpdate:modelValue': (value: string) => { item.item_instructions = value }
                  })]
                : instructions
                  ? [h('p', { class: 'mt-1 whitespace-pre-wrap text-xs text-muted' }, instructions)]
                  : [])
            ]
          : [])
      ])
    }
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
    header: props.priceInputIncludesTaxes ? 'Precio unitario con IVA' : 'Precio unitario',
    size: 190,
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right min-w-48'
      }
    },
    cell: ({ row }: any) =>
      h(UInput, {
        modelValue: displayedUnitPrice(row.original),
        type: 'number',
        min: 0,
        step: '0.01',
        size: 'lg',
        class: 'ml-auto w-40 text-right font-semibold tabular-nums',
        disabled: props.priceInputIncludesTaxes && row.original.tax_preview_ready !== true,
        'aria-label': `${props.priceInputIncludesTaxes ? 'Precio unitario con IVA' : 'Precio unitario'} de ${row.original.product_name || 'producto'}`,
        'onUpdate:modelValue': (val: number) => {
          const savedDiscountAmount = row.original.discount_amount_override
          const enteredPrice = Number(val || 0)
          row.original.unit_price = props.priceInputIncludesTaxes
            ? Number((enteredPrice / grossPriceFactor(row.original)).toFixed(2))
            : enteredPrice
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
    <ProductPickerField
      v-model="selectedProductIds"
      v-model:search-term="productSearch"
      :items="props.productOptions"
      value-key="value"
      multiple
      show-taxonomy-filters
      title="Agregar productos"
      description="Filtrá por categoría o etiqueta, buscá y seleccioná varios artículos para agregarlos juntos."
      :add-label="props.addingProducts ? 'Agregando productos...' : 'Agregar productos'"
      :loading="props.addingProducts"
      :disabled="props.addingProducts"
      :has-details="hasVariants"
      :add-disabled="!selectedProductIds.length || variantLoading || hasVariantSelectionError"
      @add="handleAdd"
    >
      <template #details>
        <div v-if="selectedVariantProducts.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <UFormField
            v-for="product in selectedVariantProducts"
            :key="product.value"
            :label="`Variante · ${product.label}`"
            required
            class="min-w-0"
          >
            <USelectMenu
              :model-value="selectedVariants[product.value]"
              :items="variantOptionsFor(product.value)"
              value-key="value"
              :placeholder="variantLoadingIds.has(product.value) ? 'Cargando variantes...' : 'Seleccionar variante...'"
              :loading="variantLoadingIds.has(product.value)"
              :disabled="variantLoadingIds.has(product.value) || !!variantErrors[product.value]"
              class="w-full min-w-0"
              @update:model-value="value => { selectedVariants[product.value] = value }"
            />
            <p v-if="variantErrors[product.value]" class="mt-1 text-xs text-error">{{ variantErrors[product.value] }}</p>
          </UFormField>
        </div>
      </template>
    </ProductPickerField>

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
