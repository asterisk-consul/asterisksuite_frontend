<script setup lang="ts">
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import { useProductVariants } from '~/modulos/logistica/master-data/product-variants/composable/useVariants'
import {
  createDefaultProductForm,
  toCreateProductPayload
} from '~/modulos/logistica/master-data/product/utils/product-form.utils'
import ProductModalForm from '~/modulos/logistica/master-data/product/components/modals/ProductModalForm.vue'

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
const { init: initProducts, selectItems: productOptions, create: createProduct } = useProducts()
const { selectItems: variantOptions, loadByProduct: initVariants } = useProductVariants()

// =========================
// STATE
// =========================

const selectedProductId = ref('')
const selectedVariantId = ref<string | undefined>(undefined)
const quantity = ref(1)
const wastePercentage = ref<number | undefined>(undefined)
const lengthMm = ref<number | undefined>(undefined)
const widthMm = ref<number | undefined>(undefined)
const heightMm = ref<number | undefined>(undefined)

const variants = ref<any[]>([])
const saving = ref(false)

// ProductModalForm state
const showProductModal = ref(false)
const newProductForm = reactive(createDefaultProductForm())

// =========================
// COMPUTED
// =========================

const isEngineering = computed(() => props.costSource === 'ENGINEERING')

const canSave = computed(() =>
  selectedProductId.value && quantity.value > 0
)

// =========================
// WATCHERS
// =========================

watch(() => props.open, (val) => {
  if (val) {
    initProducts()
    resetForm()
  }
})

watch(selectedProductId, async (pid) => {
  selectedVariantId.value = undefined
  variants.value = []
  if (!pid) return
  await initVariants(pid)
  variants.value = [...variantOptions.value]
})

// =========================
// HANDLERS
// =========================

const resetForm = () => {
  selectedProductId.value = ''
  selectedVariantId.value = undefined
  quantity.value = 1
  wastePercentage.value = undefined
  lengthMm.value = undefined
  widthMm.value = undefined
  heightMm.value = undefined
}

const openCreateProduct = () => {
  Object.assign(newProductForm, createDefaultProductForm())
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
    await $fetch('/api/logistica/master-data/engineering/components', {
      method: 'POST',
      body: {
        parent_product_id: props.parentId ?? props.productId,
        child_product_id: selectedProductId.value,
        child_variant_id: selectedVariantId.value,
        quantity: quantity.value,
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
    :ui="{ width: 'max-w-lg' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-4">
        <!-- SELECTOR DE PRODUCTO -->
        <div>
          <div class="flex items-center gap-2 mb-1">
            <label class="text-sm font-medium">Producto *</label>
            <UButton
              icon="i-lucide-plus"
              label="Nuevo"
              variant="soft"
              color="primary"
              size="xs"
              @click="openCreateProduct"
            />
          </div>

          <USelectMenu
            v-model="selectedProductId"
            :items="productOptions"
            value-key="value"
            placeholder="Buscar producto..."
            searchable
          />
        </div>

        <!-- CAMPOS DEL COMPONENTE -->
        <template v-if="selectedProductId">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm font-medium mb-1 block">Variante</label>
              <USelectMenu
                v-model="selectedVariantId"
                :items="variants"
                value-key="value"
                placeholder="—"
              />
            </div>

            <div>
              <label class="text-sm font-medium mb-1 block">Cantidad *</label>
              <UInput
                v-model.number="quantity"
                type="number"
                step="0.001"
                min="0"
              />
            </div>

            <div>
              <label class="text-sm font-medium mb-1 block">% Desperdicio</label>
              <UInput
                v-model.number="wastePercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0"
              />
            </div>
          </div>

          <!-- Dimensiones (solo ENGINEERING) -->
          <div v-if="isEngineering" class="grid grid-cols-3 gap-3">
            <div>
              <label class="text-sm font-medium mb-1 block">Largo (mm)</label>
              <UInput v-model.number="lengthMm" type="number" placeholder="0" />
            </div>
            <div>
              <label class="text-sm font-medium mb-1 block">Ancho (mm)</label>
              <UInput v-model.number="widthMm" type="number" placeholder="0" />
            </div>
            <div>
              <label class="text-sm font-medium mb-1 block">Alto (mm)</label>
              <UInput v-model.number="heightMm" type="number" placeholder="0" />
            </div>
          </div>
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
