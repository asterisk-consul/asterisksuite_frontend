<script setup lang="ts">
import { PRODUCT_COST_SOURCE_LABELS, PRODUCT_TYPE_LABELS } from '~/modulos/logistica/master-data/product/composable/product-labels'
import type { Product } from '~/modulos/logistica/master-data/product/types/product.types'
import { usePhotosService } from '~/modulos/logistica/media/photos/photos.service'
import { useUnitsStore } from '~/modulos/almacen/units/store/units.store'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

const props = defineProps<{ product: Product }>()
const photosService = usePhotosService()
const unitsStore = useUnitsStore()
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const canReadUnits = computed(() => isOwnerOrAdmin.value || hasPermission('units.read'))
const photoUrls = ref<string[]>([])
const photoUrlIndex = ref(0)
const photoLoadFailed = ref(false)
const photoLoading = ref(true)
const showPhotoPreview = ref(false)
const mainPhotoUrl = computed(() => photoUrls.value[photoUrlIndex.value] ?? null)

const cardUi = {
  header: 'border-b border-default bg-muted/20 px-3 py-2.5',
  body: 'p-3'
}

const usageLabels = {
  SALE: 'Venta',
  PURCHASE: 'Compra',
  BOTH: 'Compra y venta'
} as const

const calculationLabels = {
  UNIT: 'Unidad',
  SURFACE: 'Superficie',
  VOLUME: 'Volumen',
  LINEAR: 'Lineal'
} as const

const formatNumber = (value: unknown, maximumFractionDigits = 4) => {
  const number = Number(value)
  return Number.isFinite(number)
    ? new Intl.NumberFormat('es-AR', { maximumFractionDigits }).format(number)
    : '—'
}

const formatMoney = (value: unknown, currency?: { symbol?: string; code?: string } | null) => {
  const symbol = currency?.symbol || currency?.code || '$'
  return `${symbol} ${formatNumber(value, 2)}${currency?.symbol && currency.code ? ` · ${currency.code}` : ''}`
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

const unitName = (unit?: { name?: string | null; symbol?: string | null } | null) => {
  if (!unit) return 'Sin unidad asignada'
  return [unit.name, unit.symbol ? `(${unit.symbol})` : null].filter(Boolean).join(' ')
}

const purchaseUnit = computed(() => {
  if (!props.product.purchase_unit_id || props.product.purchase_unit_id === props.product.unit_id) return props.product.unit ?? null
  return unitsStore.items.find(unit => unit.id === props.product.purchase_unit_id) ?? null
})

const purchaseConversion = computed(() => {
  const factor = Number(props.product.purchase_to_stock_factor ?? 1)
  if (!props.product.purchase_unit_id && factor === 1) return 'Sin conversión especial (1 a 1)'
  const from = purchaseUnit.value?.symbol || purchaseUnit.value?.name || 'unidad de compra'
  const to = props.product.unit?.symbol || props.product.unit?.name || 'unidad de stock'
  return `1 ${from} = ${formatNumber(factor)} ${to}`
})

const categories = computed(() => (props.product.product_categories ?? [])
  .flatMap(relation => relation.categories && !relation.categories.deleted_at
    ? [{ id: relation.category_id, name: relation.categories.name }]
    : []))

const tags = computed(() => (props.product.product_tags ?? [])
  .flatMap((relation: any) => !relation.deleted_at && relation.tags && !relation.tags.deleted_at
    ? [{ id: relation.tag_id, name: relation.tags.name }]
    : []))

const productAttributes = computed(() => (props.product.product_attribute_values ?? [])
  .filter(value => !value.deleted_at && value.attributes?.name)
  .map(value => ({
    id: value.attribute_id,
    name: value.attributes!.name,
    value: value.boolean_value !== null && value.boolean_value !== undefined
      ? (value.boolean_value ? 'Sí' : 'No')
      : value.number_value !== null && value.number_value !== undefined
        ? formatNumber(value.number_value)
        : value.text_value?.trim() || '—'
  })))

const taxes = computed(() => (props.product.product_taxes ?? [])
  .flatMap((relation: any) => {
    if (relation.active === false || relation.taxes?.active === false || relation.taxes?.deleted_at) return []
    const tax = relation.taxes
    if (!tax) return []
    const rate = tax.is_percentage ? `${formatNumber(tax.rate, 3)}%` : formatNumber(tax.rate, 2)
    return [{
      id: tax.id,
      label: `${tax.name} · ${rate}`,
      included: relation.is_included_in_price === true
    }]
  })
)

const prices = computed(() => (props.product.product_price ?? [])
  .filter((price: any) => !price.deleted_at && price.active !== false)
  .map(price => ({
    id: price.id,
    amount: formatMoney(price.price, price.currencies),
    currency: price.currencies?.code ?? 'Moneda',
    exemption: Number(price.exemption_rate ?? 0)
  })))

const variants = computed(() => (props.product.product_variants ?? [])
  .filter(variant => !variant.deleted_at)
  .map(variant => {
    const values = (variant.product_attribute_values ?? [])
      .filter(value => !value.deleted_at && value.attributes?.name)
      .map(value => {
        const displayValue = value.boolean_value !== null && value.boolean_value !== undefined
          ? (value.boolean_value ? 'Sí' : 'No')
          : value.number_value !== null && value.number_value !== undefined
            ? formatNumber(value.number_value)
            : value.text_value?.trim() || ''
        return displayValue ? `${value.attributes!.name}: ${displayValue}` : ''
      })
      .filter(Boolean)
    const measurements = [
      variant.thickness_mm != null ? `Espesor ${formatNumber(variant.thickness_mm)} mm` : null,
      variant.density_kg_m3 != null ? `Densidad ${formatNumber(variant.density_kg_m3)} kg/m³` : null,
      variant.weight_kg != null ? `Peso ${formatNumber(variant.weight_kg)} kg` : null,
      variant.weight_per_m2_kg != null ? `${formatNumber(variant.weight_per_m2_kg)} kg/m²` : null,
      variant.weight_per_meter_kg != null ? `${formatNumber(variant.weight_per_meter_kg)} kg/m` : null
    ].filter(Boolean)
    const variantPrices = (variant.productVariantPrices ?? [])
      .filter(price => price.active && !price.deleted_at)
      .map(price => formatMoney(price.price, price.currency))
    const variantCosts = (variant.productVariantCosts ?? [])
      .filter(cost => cost.active && !cost.deleted_at)
      .map(cost => formatMoney(cost.cost, cost.currency))

    return {
      id: variant.id,
      name: variant.name || 'Variante',
      sku: variant.sku,
      active: variant.active !== false,
      details: [...values, ...measurements],
      prices: variantPrices,
      costs: variantCosts
    }
  }))

const accountName = (account?: { code?: string | null; name?: string | null } | null) =>
  account ? [account.code, account.name].filter(Boolean).join(' · ') : 'Sin asignar'

async function loadMainPhoto() {
  const productId = props.product.id
  photoUrls.value = []
  photoUrlIndex.value = 0
  photoLoadFailed.value = false
  photoLoading.value = true
  showPhotoPreview.value = false

  try {
    const result = await photosService.findMediaByEntity('product', productId) as Array<{
      photo_type?: string | null
      mime_type?: string | null
      file_id?: string | null
      file_name?: string | null
      deleted_at?: string | null
      thumb_url?: string | null
      medium_url?: string | null
      url?: string | null
    }> | null
    if (props.product.id !== productId) return

    const imagePhotos = (Array.isArray(result) ? result : []).filter(photo =>
      !photo.deleted_at && (
        photo.mime_type?.startsWith('image/')
        || photo.thumb_url
        || photo.medium_url
        || photo.file_id
        || /\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(photo.file_name ?? '')
      )
    )
    const newestFirst = [...imagePhotos].reverse()
    const photo = newestFirst.find(item => item.photo_type === 'frontal')
      ?? newestFirst.find(item => item.photo_type === 'default')
      ?? newestFirst[0]
    if (!photo) return

    const fileId = photo.file_id
    photoUrls.value = [...new Set([
      photo.medium_url,
      photo.thumb_url,
      photo.url,
      fileId ? `/api/media/files/${fileId}/medium` : null,
      fileId ? `/api/media/files/${fileId}/view` : null
    ].filter((url): url is string => Boolean(url)))]
  } catch {
    if (props.product.id === productId) photoLoadFailed.value = true
  } finally {
    if (props.product.id === productId) photoLoading.value = false
  }
}

function handlePhotoError() {
  if (photoUrlIndex.value + 1 < photoUrls.value.length) {
    photoUrlIndex.value += 1
    return
  }
  photoLoadFailed.value = true
}

onMounted(() => {
  void loadMainPhoto()
  const hasDifferentPurchaseUnit = props.product.purchase_unit_id && props.product.purchase_unit_id !== props.product.unit_id
  if (hasDifferentPurchaseUnit && canReadUnits.value && !unitsStore.items.length) void unitsStore.fetchAll().catch(() => undefined)
})

watch(() => props.product.id, () => void loadMainPhoto())
</script>

<template>
  <div class="mt-4 flex flex-col gap-3">
    <section class="grid gap-3 rounded-xl border border-default bg-gradient-to-r from-primary/5 via-elevated/30 to-transparent p-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-center">
      <button
        v-if="mainPhotoUrl && !photoLoadFailed"
        type="button"
        class="group relative flex aspect-square w-full max-w-32 cursor-zoom-in items-center justify-center overflow-hidden rounded-lg border border-default bg-elevated/50 focus-visible:outline-2 focus-visible:outline-primary sm:max-w-none"
        :aria-label="`Ampliar foto de ${product.name}`"
        @click="showPhotoPreview = true"
      >
        <img
          :src="mainPhotoUrl"
          :alt="`Foto de ${product.name}`"
          class="size-full object-contain p-1.5 transition-transform duration-200 group-hover:scale-105"
          @error="handlePhotoError"
        >
        <span class="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
          <UIcon name="i-lucide-zoom-in" class="size-6 drop-shadow" />
        </span>
      </button>
      <div v-else class="flex aspect-square w-full max-w-32 items-center justify-center overflow-hidden rounded-lg border border-default bg-elevated/50 text-muted sm:max-w-none" :aria-label="photoLoading ? 'Cargando foto' : 'Sin foto del producto'">
        <USkeleton v-if="photoLoading" class="size-12 rounded-lg" />
        <div v-else class="flex flex-col items-center gap-1">
          <UIcon name="i-lucide-image" class="size-7" />
          <span class="text-[10px]">Sin foto</span>
        </div>
      </div>
      <div class="flex min-w-0 flex-col justify-center gap-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-lg font-semibold tracking-tight">{{ product.name }}</p>
            <p class="mt-0.5 text-sm text-muted">{{ product.sku ? `SKU ${product.sku}` : 'Sin código SKU' }}</p>
          </div>
          <UBadge :color="product.active === false ? 'neutral' : 'success'" variant="subtle">
            {{ product.active === false ? 'Inactivo' : 'Activo' }}
          </UBadge>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <UBadge color="primary" variant="subtle" size="sm">{{ PRODUCT_TYPE_LABELS[product.product_type] ?? 'Producto' }}</UBadge>
          <UBadge color="neutral" variant="subtle" size="sm">{{ usageLabels[product.usage_type] ?? 'Compra y venta' }}</UBadge>
          <UBadge v-if="product.manages_stock" color="info" variant="subtle" size="sm">Controla stock</UBadge>
          <UBadge v-if="product.needs_cost_recalculation" color="warning" variant="subtle" size="sm">Costo por recalcular</UBadge>
        </div>
      </div>
    </section>

    <UModal v-model:open="showPhotoPreview" :title="product.name" :description="product.sku ? `SKU ${product.sku}` : 'Foto del producto'" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div class="flex max-h-[75vh] items-center justify-center overflow-hidden rounded-xl bg-elevated/40 p-2">
          <img v-if="mainPhotoUrl" :src="mainPhotoUrl" :alt="`Foto de ${product.name}`" class="max-h-[70vh] max-w-full object-contain" @error="handlePhotoError">
        </div>
      </template>
    </UModal>

    <div class="grid items-start gap-3 xl:grid-cols-2 2xl:grid-cols-3">
      <UCard :ui="cardUi">
        <template #header>
          <div class="flex items-center gap-2">
            <span class="flex size-7 items-center justify-center rounded-lg bg-primary/10"><UIcon name="i-lucide-list-checks" class="size-4 text-primary" /></span>
            <h2 class="text-sm font-semibold">Tipo y configuración</h2>
          </div>
        </template>
        <dl class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <div>
            <dt class="text-xs font-medium text-muted">Tipo de producto</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ PRODUCT_TYPE_LABELS[product.product_type] ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-muted">Se utiliza para</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ usageLabels[product.usage_type] ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-muted">Unidad de cálculo</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ calculationLabels[product.calculation_type ?? 'UNIT'] }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-muted">Origen del costo</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ PRODUCT_COST_SOURCE_LABELS[product.cost_source] ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-muted">Producto compuesto</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ product.is_composed ? 'Sí' : 'No' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-muted">Ingeniería</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ product.has_engineering ? 'Configurada' : 'No configurada' }}</dd>
          </div>
          <div v-if="product.is_rate_type || product.transfer_rate" class="sm:col-span-2">
            <dt class="text-xs font-medium text-muted">Tarifa asociada</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ product.transfer_rate?.name ?? 'Sin tarifa asignada' }}</dd>
            <p v-if="product.transfer_rate?.description" class="mt-1 text-sm text-muted">{{ product.transfer_rate.description }}</p>
          </div>
        </dl>
      </UCard>

      <UCard :ui="cardUi">
        <template #header>
          <div class="flex items-center gap-2">
            <span class="flex size-7 items-center justify-center rounded-lg bg-primary/10"><UIcon name="i-lucide-box" class="size-4 text-primary" /></span>
            <h2 class="text-sm font-semibold">Stock y logística</h2>
          </div>
        </template>
        <dl class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <div>
            <dt class="text-xs font-medium text-muted">Administra stock</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ product.manages_stock ? 'Sí' : 'No' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-muted">Unidad de inventario</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ product.manages_stock ? unitName(product.unit) : 'No aplica' }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs font-medium text-muted">Conversión de compra a inventario</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ product.manages_stock ? purchaseConversion : 'No aplica' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-muted">Requiere frío</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ product.requires_refrigeration ? 'Requerida' : 'No requerida' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-muted">Calcula el costo automáticamente</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ product.auto_calculate_cost ? 'Sí' : 'No' }}</dd>
          </div>
        </dl>
      </UCard>

      <UCard :ui="cardUi">
        <template #header>
          <div class="flex items-center gap-2">
            <span class="flex size-7 items-center justify-center rounded-lg bg-primary/10"><UIcon name="i-lucide-tags" class="size-4 text-primary" /></span>
            <h2 class="text-sm font-semibold">Categorías y atributos</h2>
          </div>
        </template>
        <div class="space-y-2">
          <div>
            <p class="mb-1 text-xs font-medium text-muted">Categorías</p>
            <div v-if="categories.length" class="flex flex-wrap gap-2">
              <UBadge v-for="category in categories" :key="category.id" color="neutral" variant="subtle">{{ category.name }}</UBadge>
            </div>
            <p v-else class="text-sm text-muted">Sin categorías asignadas</p>
          </div>
          <USeparator />
          <div>
            <p class="mb-1 text-xs font-medium text-muted">Etiquetas</p>
            <div v-if="tags.length" class="flex flex-wrap gap-2">
              <UBadge v-for="tag in tags" :key="tag.id" color="primary" variant="subtle">{{ tag.name }}</UBadge>
            </div>
            <p v-else class="text-sm text-muted">Sin etiquetas asignadas</p>
          </div>
          <template v-if="productAttributes.length">
            <USeparator />
            <dl class="grid gap-2 sm:grid-cols-2">
              <div v-for="attribute in productAttributes" :key="attribute.id">
                <dt class="text-xs font-medium text-muted">{{ attribute.name }}</dt>
                <dd class="mt-0.5 text-sm font-semibold">{{ attribute.value }}</dd>
              </div>
            </dl>
          </template>
        </div>
      </UCard>

      <UCard :ui="cardUi">
        <template #header>
          <div class="flex items-center gap-2">
            <span class="flex size-7 items-center justify-center rounded-lg bg-primary/10"><UIcon name="i-lucide-wallet-cards" class="size-4 text-primary" /></span>
            <h2 class="text-sm font-semibold">Venta y precios</h2>
          </div>
        </template>
        <div class="space-y-2">
          <dl class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <div>
              <dt class="text-xs font-medium text-muted">Precio habilitado</dt>
              <dd class="mt-0.5 text-sm font-semibold">{{ product.price_enabled ? 'Sí' : 'No' }}</dd>
            </div>
            <div v-if="Number(product.sale_margin_percentage ?? 0) > 0">
              <dt class="text-xs font-medium text-muted">Margen de venta</dt>
              <dd class="mt-0.5 text-sm font-semibold">{{ formatNumber(product.sale_margin_percentage, 2) }}%</dd>
            </div>
          </dl>
          <div>
            <p class="mb-1 text-xs font-medium text-muted">Precios generales</p>
            <div v-if="prices.length" class="space-y-2">
              <div v-for="price in prices" :key="price.id" class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-default bg-muted/20 px-3 py-2">
                <UBadge color="neutral" variant="subtle">{{ price.currency }}</UBadge>
                <span class="font-semibold tabular-nums">{{ price.amount }}</span>
                <span v-if="price.exemption" class="text-xs text-muted">Exención {{ formatNumber(price.exemption, 2) }}%</span>
              </div>
            </div>
            <p v-else class="text-sm text-muted">Sin precios generales cargados</p>
          </div>
        </div>
      </UCard>

      <UCard :ui="cardUi">
        <template #header>
          <div class="flex items-center gap-2">
            <span class="flex size-7 items-center justify-center rounded-lg bg-primary/10"><UIcon name="i-lucide-landmark" class="size-4 text-primary" /></span>
            <h2 class="text-sm font-semibold">Impuestos y cuentas contables</h2>
          </div>
        </template>
        <dl class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <dt class="text-xs font-medium text-muted">Categoría fiscal</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ product.tax_category ? `${product.tax_category.code} · ${product.tax_category.name}` : 'Sin categoría fiscal' }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs font-medium text-muted">Impuestos asignados</dt>
            <dd v-if="taxes.length" class="mt-2 flex flex-wrap gap-2">
              <UBadge v-for="tax in taxes" :key="tax.id" color="neutral" variant="subtle">
                {{ tax.label }}{{ tax.included ? ' · incluido en precio' : '' }}
              </UBadge>
            </dd>
            <dd v-else class="mt-1 text-sm text-muted">Sin impuestos directos asignados</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-muted">Cuenta de ingresos</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ accountName(product.income_account) }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-muted">Cuenta de egresos</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ accountName(product.expense_account) }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs font-medium text-muted">Cuenta de inventario</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ accountName(product.inventory_account) }}</dd>
          </div>
        </dl>
      </UCard>

      <UCard v-if="variants.length" :ui="cardUi">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-layers-2" class="size-4 text-primary" />
              <h2 class="font-semibold">Variantes</h2>
            </div>
            <UBadge color="neutral" variant="subtle">{{ variants.length }}</UBadge>
          </div>
        </template>
        <div class="max-h-80 space-y-2 overflow-y-auto pr-1">
          <article v-for="variant in variants" :key="variant.id" class="rounded-lg border border-default bg-muted/20 p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate font-medium">{{ variant.name }}</p>
                <p class="text-xs text-muted">{{ variant.sku ? `SKU ${variant.sku}` : 'Sin SKU' }}</p>
              </div>
              <UBadge :color="variant.active ? 'success' : 'neutral'" variant="subtle" size="sm">{{ variant.active ? 'Activa' : 'Inactiva' }}</UBadge>
            </div>
            <p v-if="variant.details.length" class="mt-2 text-xs text-muted">{{ variant.details.join(' · ') }}</p>
            <div v-if="variant.prices.length || variant.costs.length" class="mt-2 flex flex-wrap gap-2">
              <UBadge v-for="(price, index) in variant.prices" :key="`price-${index}`" color="primary" variant="subtle">Precio {{ price }}</UBadge>
              <UBadge v-for="(cost, index) in variant.costs" :key="`cost-${index}`" color="warning" variant="subtle">Costo {{ cost }}</UBadge>
            </div>
          </article>
        </div>
      </UCard>

      <UCard :ui="cardUi">
        <template #header>
          <div class="flex items-center gap-2">
            <span class="flex size-7 items-center justify-center rounded-lg bg-primary/10"><UIcon name="i-lucide-clock-3" class="size-4 text-primary" /></span>
            <h2 class="text-sm font-semibold">Fechas del producto</h2>
          </div>
        </template>
        <dl class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <div>
            <dt class="text-xs font-medium text-muted">Creado</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ formatDate(product.created_at) }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-muted">Última actualización</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ formatDate(product.updated_at) }}</dd>
          </div>
          <div v-if="product.last_cost_calculated_at" class="sm:col-span-2">
            <dt class="text-xs font-medium text-muted">Último cálculo de costo</dt>
            <dd class="mt-0.5 text-sm font-semibold">{{ formatDate(product.last_cost_calculated_at) }}</dd>
          </div>
        </dl>
      </UCard>
    </div>
  </div>
</template>
