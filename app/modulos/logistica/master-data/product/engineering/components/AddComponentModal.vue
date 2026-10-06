<script setup lang="ts">
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import { useProductVariants } from '~/modulos/logistica/master-data/product-variants/composable/useVariants'
import {
  createDefaultProductForm,
  toCreateProductPayload
} from '~/modulos/logistica/master-data/product/utils/product-form.utils'
import ProductModalForm from '~/modulos/logistica/master-data/product/components/modals/ProductModalForm.vue'
import { useUnitsStore } from '~/modulos/almacen/units/store/units.store'

const props = defineProps<{
  open: boolean
  productId: string
  parentId: string | null
  parentName?: string
  costSource?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const toast = useToast()
const {
  init: initProducts,
  products,
  loading: loadingProducts,
  error: productsError,
  create: createProduct
} = useProducts()
const { selectItems: variantOptions, loadByProduct: initVariants } = useProductVariants()

// =========================
// STATE
// =========================

const selectedProductId = ref('')
const selectedVariantId = ref<string | undefined>(undefined)
const selectedUnitId = ref<string | undefined>(undefined)
const quantity = ref(1)
const wastePercentage = ref<number | undefined>(undefined)
const lengthMm = ref<number | undefined>(undefined)
const widthMm = ref<number | undefined>(undefined)
const heightMm = ref<number | undefined>(undefined)
const selectedType = ref('ALL')
const selectedCategoryId = ref('ALL')

const variants = ref<any[]>([])
const unitsStore = useUnitsStore()
const { items: units } = storeToRefs(unitsStore)
const saving = ref(false)
const catalogLoaded = ref(false)

// ProductModalForm state
const showProductModal = ref(false)
const newProductForm = reactive(createDefaultProductForm())

// =========================
// COMPUTED
// =========================

const isEngineering = computed(() => props.costSource === 'ENGINEERING')
const typeLabels: Record<string, string> = {
  RAW_MATERIAL: 'Materia prima',
  SEMI_FINISHED: 'Producto intermedio',
  FINISHED_PRODUCT: 'Producto terminado',
  SERVICE: 'Servicio / proceso'
}
const allowedComponentTypes = new Set(Object.keys(typeLabels))
const typeFilters = [
  { label: 'Todos', value: 'ALL', icon: 'i-lucide-layers-3' },
  { label: 'Materias primas', value: 'RAW_MATERIAL', icon: 'i-lucide-box' },
  { label: 'Intermedios', value: 'SEMI_FINISHED', icon: 'i-lucide-boxes' },
  { label: 'Servicios', value: 'SERVICE', icon: 'i-lucide-wrench' },
  { label: 'Terminados', value: 'FINISHED_PRODUCT', icon: 'i-lucide-package-check' }
]
const eligibleProducts = computed(() => products.value
  .filter(product => product.id !== props.productId && allowedComponentTypes.has(product.product_type)))
const categoryOptions = computed(() => {
  const categories = new Map<string, string>()
  for (const product of eligibleProducts.value) {
    for (const relation of product.product_categories ?? []) {
      if (relation.categories?.id && relation.categories?.name) {
        categories.set(relation.categories.id, relation.categories.name)
      }
    }
  }
  return [
    { label: 'Todas las categorías', value: 'ALL' },
    ...Array.from(categories.entries())
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([value, label]) => ({ label, value }))
  ]
})
const filteredProducts = computed(() => eligibleProducts.value
  .filter(product => selectedType.value === 'ALL' || product.product_type === selectedType.value)
  .filter(product => selectedCategoryId.value === 'ALL'
    || product.product_categories?.some(relation => relation.category_id === selectedCategoryId.value)))
const productOptions = computed(() => filteredProducts.value
  .sort((a, b) => {
    const typeOrder = ['RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED_PRODUCT', 'SERVICE']
    return typeOrder.indexOf(a.product_type) - typeOrder.indexOf(b.product_type)
      || a.name.localeCompare(b.name, 'es')
  })
  .map(product => ({
    label: `${typeLabels[product.product_type]} · ${product.sku ? `${product.sku} - ` : ''}${product.name}`,
    value: product.id,
    unit_id: product.unit_id,
    product_type: product.product_type
  })))
const selectedProduct = computed(() => eligibleProducts.value.find(product => product.id === selectedProductId.value))
const unitOptions = computed(() => units.value.filter(unit => unit.active).map(unit => ({ label: `${unit.name} (${unit.symbol})`, value: unit.id })))

const canSave = computed(() =>
  selectedProductId.value && quantity.value > 0
)

// =========================
// WATCHERS
// =========================

const loadCatalog = async () => {
  catalogLoaded.value = false
  try {
    await Promise.all([initProducts(), unitsStore.fetchAll()])
    catalogLoaded.value = true
  } catch (err: any) {
    toast.add({
      title: 'No se pudo cargar el catálogo',
      description: err?.data?.message || 'Revisá la conexión con el backend e intentá nuevamente.',
      color: 'error'
    })
  }
}

watch(() => props.open, async (val) => {
  if (val) {
    resetForm()
    await loadCatalog()
  }
})

watch(selectedProductId, async (pid) => {
  selectedVariantId.value = undefined
  variants.value = []
  if (!pid) return
  selectedUnitId.value = selectedProduct.value?.unit_id ?? undefined
  await initVariants(pid)
  variants.value = [...variantOptions.value]
})

watch([selectedType, selectedCategoryId], () => {
  if (selectedProductId.value && !filteredProducts.value.some(product => product.id === selectedProductId.value)) {
    selectedProductId.value = ''
  }
})

// =========================
// HANDLERS
// =========================

const resetForm = () => {
  selectedProductId.value = ''
  selectedVariantId.value = undefined
  selectedUnitId.value = undefined
  quantity.value = 1
  wastePercentage.value = undefined
  lengthMm.value = undefined
  widthMm.value = undefined
  heightMm.value = undefined
  selectedType.value = 'ALL'
  selectedCategoryId.value = 'ALL'
}

const openCreateProduct = () => {
  Object.assign(newProductForm, createDefaultProductForm())
  if (selectedType.value !== 'ALL') {
    newProductForm.product_type = selectedType.value as any
  }
  showProductModal.value = true
}

const handleProductCreated = async () => {
  if (!newProductForm.name) return

  try {
    const created = await createProduct(toCreateProductPayload(newProductForm))
    if (created?.id) {
      selectedProductId.value = created.id
      toast.add({ title: 'Producto creado y seleccionado', color: 'success' })
      showProductModal.value = false
    }
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err?.data?.message || 'No se pudo crear el producto.',
      color: 'error'
    })
  }
}

const handleSave = async () => {
  if (!canSave.value) return

  saving.value = true
  try {
    await $fetch('/api/backend/master-data/engineering/components', {
      method: 'POST',
      body: {
        parent_product_id: props.parentId ?? props.productId,
        child_product_id: selectedProductId.value,
        child_variant_id: selectedVariantId.value,
        quantity: quantity.value,
        unit_id: selectedUnitId.value,
        waste_percentage: wastePercentage.value,
        length_mm: lengthMm.value,
        width_mm: widthMm.value,
        height_mm: heightMm.value
      }
    })

    toast.add({ title: 'Componente agregado', color: 'success' })
    emit('saved')
    emit('update:open', false)
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err?.data?.message || 'No se pudo agregar el componente.',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="parentId ? `Agregar hijo a ${parentName}` : 'Agregar componente'"
    :ui="{ width: 'max-w-3xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-6">
        <UAlert
          v-if="parentId"
          color="info"
          variant="soft"
          icon="i-lucide-git-branch"
          title="Componente de un subconjunto"
          :description="`Se agregará dentro de ${parentName}. Su costo se acumulará primero en ese producto intermedio.`"
        />

        <!-- SELECTOR DE PRODUCTO -->
        <section class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="text-sm font-semibold">1. Elegí el componente</p>
              <p class="text-xs text-muted">Filtrá por función y categoría para encontrarlo más rápido.</p>
            </div>
            <UButton
              icon="i-lucide-plus"
              label="Crear producto"
              variant="soft"
              color="primary"
              size="xs"
              @click="openCreateProduct"
            />
          </div>

          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <button
              v-for="filter in typeFilters"
              :key="filter.value"
              type="button"
              class="flex min-h-16 flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition"
              :class="selectedType === filter.value
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-default bg-default hover:bg-elevated'"
              @click="selectedType = filter.value"
            >
              <UIcon :name="filter.icon" class="mb-1 size-4" />
              <span class="text-xs font-medium leading-tight">{{ filter.label }}</span>
            </button>
          </div>

          <div class="grid gap-3 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
            <UFormField label="Categoría">
              <USelect
                v-model="selectedCategoryId"
                :items="categoryOptions"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Producto" required>
              <div v-if="loadingProducts" class="flex h-10 items-center gap-2 rounded-md border border-default px-3 text-sm text-muted">
                <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
                Cargando productos…
              </div>
              <div v-else-if="productsError" class="rounded-lg border border-error/30 bg-error/5 p-3">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium text-error">No se pudo cargar el catálogo</p>
                    <p class="mt-1 text-xs text-muted">{{ productsError }}</p>
                  </div>
                  <UButton label="Reintentar" icon="i-lucide-refresh-cw" size="xs" variant="soft" color="error" @click="loadCatalog" />
                </div>
              </div>
              <USelectMenu
                v-else
                v-model="selectedProductId"
                :items="productOptions"
                value-key="value"
                :placeholder="productOptions.length
                  ? 'Buscar por nombre o SKU...'
                  : catalogLoaded
                    ? 'No hay productos para estos filtros'
                    : 'Cargando catálogo...'"
                searchable
                class="w-full"
                :disabled="!productOptions.length"
              />
            </UFormField>
          </div>

          <div v-if="selectedProduct" class="flex flex-wrap items-center gap-2 rounded-lg border border-default bg-elevated/40 px-3 py-2">
            <UBadge :label="typeLabels[selectedProduct.product_type]" color="primary" variant="soft" size="sm" />
            <span class="text-sm font-medium">{{ selectedProduct.name }}</span>
            <span v-if="selectedProduct.sku" class="text-xs font-mono text-muted">{{ selectedProduct.sku }}</span>
            <span class="ml-auto text-xs text-muted">
              {{ selectedProduct.current_cost ? `Costo vigente: $ ${Number(selectedProduct.current_cost).toLocaleString('es-AR')}` : 'Sin costo vigente' }}
            </span>
          </div>
        </section>

        <!-- CAMPOS DEL COMPONENTE -->
        <template v-if="selectedProductId">
          <section class="space-y-3 border-t border-default pt-5">
            <div>
              <p class="text-sm font-semibold">2. Definí el consumo</p>
              <p class="text-xs text-muted">Cantidad necesaria para fabricar una unidad del producto principal.</p>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <UFormField label="Variante">
              <USelectMenu
                v-model="selectedVariantId"
                :items="variants"
                value-key="value"
                placeholder="Sin variante"
                class="w-full"
              />
              </UFormField>

              <UFormField label="Cantidad" required>
              <UInput
                v-model.number="quantity"
                type="number"
                step="0.001"
                min="0"
                class="w-full"
              />
              </UFormField>

              <UFormField v-if="!isEngineering" label="Unidad del consumo">
              <USelect v-model="selectedUnitId" :items="unitOptions" placeholder="Unidad base del material" class="w-full" />
              </UFormField>

              <UFormField label="Desperdicio (%)" hint="Opcional">
              <UInput
                v-model.number="wastePercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0"
                class="w-full"
              />
              </UFormField>
            </div>

          <!-- Dimensiones (solo ENGINEERING) -->
            <UAlert v-if="!isEngineering" color="neutral" variant="soft" icon="i-lucide-info" title="Cantidad BOM" description="Se usará la cantidad y el desperdicio indicados. Las dimensiones no intervienen en este modo." />

            <div v-if="isEngineering" class="space-y-3 rounded-lg border border-default p-4">
              <div>
                <p class="text-sm font-medium">Dimensiones de cada pieza</p>
                <p class="text-xs text-muted">Se multiplican por la cantidad y contemplan el desperdicio.</p>
              </div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <UFormField label="Largo" hint="mm"><UInput v-model.number="lengthMm" type="number" placeholder="0" class="w-full" /></UFormField>
                <UFormField label="Ancho" hint="mm"><UInput v-model.number="widthMm" type="number" placeholder="0" class="w-full" /></UFormField>
                <UFormField label="Alto" hint="mm"><UInput v-model.number="heightMm" type="number" placeholder="0" class="w-full" /></UFormField>
              </div>
            </div>
          </section>
        </template>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          variant="ghost"
          color="neutral"
          label="Cancelar"
          @click="emit('update:open', false)"
        />
        <UButton
          label="Agregar"
          icon="i-lucide-plus"
          :loading="saving"
          :disabled="!canSave"
          @click="handleSave"
        />
      </div>
    </template>
  </UModal>

  <!-- Modal crear producto (mismo que /productos) -->
  <ProductModalForm
    v-model:open="showProductModal"
    :form="newProductForm"
    @submit="handleProductCreated"
  />
</template>
