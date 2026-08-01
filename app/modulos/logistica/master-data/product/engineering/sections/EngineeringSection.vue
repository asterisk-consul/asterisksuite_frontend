<script setup lang="ts">
import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'
import type { ProductCostSource } from '~/modulos/logistica/master-data/product/types/product.types'

import { ProductCostSourceOptions } from '~/modulos/logistica/master-data/product/utils/product-options.utils'

import EngineeringTree from '~/modulos/logistica/master-data/product/engineering/components/EngineeringTree.vue'
import EngineeringComponentModal from '~/modulos/logistica/master-data/product/engineering/modals/EngineeringComponentModal.vue'

import {
  createDefaultProductForm,
  toCreateProductPayload
} from '~/modulos/logistica/master-data/product/utils/product-form.utils'

import { useEngineering } from '~/modulos/logistica/master-data/product/engineering/composables/useEngineering'
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import ProductModalForm from '~/modulos/logistica/master-data/product/components/modals/ProductModalForm.vue'

const props = withDefaults(defineProps<{
  productId: string
  form: ProductFormState
  excludeSources?: ProductCostSource[]
}>(), {
  excludeSources: () => []
})

const emit = defineEmits<{
  'update:costSource': [value: ProductCostSource]
}>()

const form = reactive(createDefaultProductForm())
const toast = useToast()
const engineering = useEngineering(props.productId)
const { create } = useProducts()

const selectedParent = ref<any | null>(null)
const editingNode = ref<any | null>(null)

const showModal = ref(false)
const showDeleteModal = ref(false)
const showProductModal = ref(false)

const deletingNode = ref<any | null>(null)
const deleteConfirmText = ref('')

const loadingCaculate = ref(false)

// =========================
// COST SOURCE SELECTOR
// =========================

const filteredCostSourceOptions = computed(() =>
  ProductCostSourceOptions.filter(opt => !props.excludeSources.includes(opt.value))
)

const costSourceDescriptions: Record<string, { label: string; description: string; icon: string }> = {
  BOM: {
    label: 'BOM',
    description: 'Lista de materiales. Estructura de componentes con cantidades.',
    icon: 'i-lucide-package'
  },
  ENGINEERING: {
    label: 'Ingeniería',
    description: 'Cálculo por dimensiones físicas (largo × ancho × alto × densidad).',
    icon: 'i-lucide-ruler'
  },
  PURCHASE: {
    label: 'Compra',
    description: 'Costo de compra del proveedor. Misma estructura que BOM.',
    icon: 'i-lucide-shopping-cart'
  },
  RATE: {
    label: 'Tasa',
    description: 'Tarifa de transporte o servicio. Sin árbol de componentes.',
    icon: 'i-lucide-truck'
  },
  MANUAL: {
    label: 'Manual',
    description: 'El usuario ingresa el costo directamente.',
    icon: 'i-lucide-pencil'
  }
}

const showTree = computed(() => 
  ['BOM', 'ENGINEERING', 'PURCHASE'].includes(props.form.cost_source)
)

const showRateConfig = computed(() => props.form.cost_source === 'RATE')

// =========================
// TREE HANDLERS
// =========================

const handleAdd = (parent: any | null) => {
  selectedParent.value = parent.child_product_id
  editingNode.value = null
  showModal.value = true
}

const handleAddProduct = () => {
  showProductModal.value = true
}

const handleDelete = (node: any) => {
  deletingNode.value = node
  deleteConfirmText.value = ''
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (!deletingNode.value || deleteConfirmText.value !== 'eliminar') return
  await engineering.deleteComponent(deletingNode.value.id)
  toast.add({
    title: 'Componente eliminado',
    description: 'El componente fue eliminado correctamente.',
    color: 'success'
  })
  showDeleteModal.value = false
  deletingNode.value = null
  deleteConfirmText.value = ''
}

const handleEdit = (node: any) => {
  editingNode.value = node
  showModal.value = true
}

const handleCalcular = async () => {
  loadingCaculate.value = true
  await engineering.calculate()
  toast.add({
    title: 'Costo calculado',
    description: 'El costo fue recalculado y guardado correctamente.',
    color: 'success'
  })
  loadingCaculate.value = false
}

const handleSaved = async () => {
  await engineering.loadTree()
  showModal.value = false
  selectedParent.value = null
  editingNode.value = null
}

const resetForm = () => {
  Object.assign(form, createDefaultProductForm())
}

const saveProduct = async () => {
  await create(toCreateProductPayload(form))
  resetForm()
  showProductModal.value = false
}

onMounted(async () => {
  await engineering.loadTree()
})
</script>

<template>
  <div class="space-y-4">
    <!-- ========================= -->
    <!-- SELECTOR DE TIPO           -->
    <!-- ========================= -->
    <UCard>
      <template #header>
        <p class="text-sm font-medium">Tipo de estructura</p>
      </template>
      <div class="flex items-center gap-1.5">
        <USelect
          :model-value="form.cost_source"
          :items="filteredCostSourceOptions"
          class="flex-1"
          @update:model-value="emit('update:costSource', $event)"
        />
        <UPopover>
          <UIcon name="i-lucide-help-circle" class="h-5 w-5 text-muted shrink-0 cursor-help hover:text-default transition-colors" />
          <template #content>
            <div class="p-4 max-w-xs space-y-3">
              <p class="text-xs font-semibold text-muted uppercase tracking-wide">Tipos de estructura</p>
              <div class="space-y-3">
                <div
                  v-for="(info, type) in costSourceDescriptions"
                  :key="type"
                  class="flex gap-3"
                >
                  <div class="size-7 rounded-md bg-elevated flex items-center justify-center shrink-0 mt-0.5">
                    <UIcon :name="info.icon" class="size-3.5 text-muted" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-default">{{ info.label }}</p>
                    <p class="text-xs text-muted leading-relaxed">{{ info.description }}</p>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </UPopover>
      </div>
    </UCard>

    <!-- ========================= -->
    <!-- ÁRBOL (BOM/ENGINEERING)   -->
    <!-- ========================= -->
    <template v-if="showTree">
      <div class="flex items-center justify-between">
        <h2 class="font-medium">
          {{ form.cost_source === 'ENGINEERING' ? 'Árbol de ingeniería' : 'Árbol de componentes' }}
        </h2>

        <div class="flex items-center gap-2">
          <UButton
            size="sm"
            label="Calcular"
            variant="soft"
            color="warning"
            :loading="loadingCaculate"
            @click="handleCalcular"
            class="cursor-pointer"
          />

          <UButton
            size="sm"
            label="Agregar nuevo producto"
            variant="soft"
            color="neutral"
            class="cursor-pointer"
            @click="handleAddProduct"
          />

          <UButton
            label="Agregar componente"
            icon="i-lucide-plus"
            size="sm"
            class="cursor-pointer"
            @click="handleAdd(props.productId)"
          />
        </div>
      </div>

      <UCard>
        <EngineeringTree
          :productId="productId"
          @add-child="handleAdd"
          @edit-node="handleEdit"
          @delete-node="handleDelete"
        />
      </UCard>
    </template>

    <!-- ========================= -->
    <!-- TARIFA (RATE)             -->
    <!-- ========================= -->
    <template v-else-if="showRateConfig">
      <UCard>
        <template #header>
          <p class="text-sm font-medium">Configuración de tarifa</p>
        </template>
        <div class="py-8 text-center text-sm text-muted">
          <UIcon name="i-lucide-truck" class="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p>La tarifa se configura desde el módulo de Transporte.</p>
          <p class="mt-1">El costo se calcula automáticamente desde la tarifa asignada al producto.</p>
        </div>
      </UCard>
    </template>

    <!-- ========================= -->
    <!-- MODALES                   -->
    <!-- ========================= -->
    <EngineeringComponentModal
      v-model:open="showModal"
      :productId="productId"
      :component="editingNode"
      :parentId="selectedParent"
      @saved="handleSaved"
    />

    <ProductModalForm v-model:open="showProductModal" :form="form" @submit="saveProduct" />

    <!-- Modal confirmación eliminar -->
    <UModal v-model:open="showDeleteModal" title="Eliminar componente">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">
            ¿Estás seguro que querés eliminar
            <span class="font-medium text-highlighted">
              {{ deletingNode?.child_product?.name }}
            </span>
            ? Esta acción no se puede deshacer y eliminará también todos sus componentes hijos.
          </p>
          <p class="text-sm text-muted">
            Para confirmar, escribí
            <span class="font-medium text-highlighted font-mono">eliminar</span>
            en el campo de abajo.
          </p>

          <UInput v-model="deleteConfirmText" placeholder="eliminar" />

          <div class="flex justify-end gap-2 pt-2 border-t border-default">
            <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">Cancelar</UButton>
            <UButton
              color="error"
              :loading="engineering.loading.value"
              :disabled="deleteConfirmText !== 'eliminar'"
              @click="confirmDelete"
            >
              Eliminar
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
