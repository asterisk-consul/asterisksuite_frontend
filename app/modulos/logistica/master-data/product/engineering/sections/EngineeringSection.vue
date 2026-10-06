<script setup lang="ts">
import type { ProductFormState } from '~/modulos/logistica/master-data/product/types/product-form.types'
import type { ProductCostSource } from '~/modulos/logistica/master-data/product/types/product.types'

import { ProductCostSourceOptions } from '~/modulos/logistica/master-data/product/utils/product-options.utils'

import EngineeringTree from '~/modulos/logistica/master-data/product/engineering/components/EngineeringTree.vue'

import { useEngineering } from '~/modulos/logistica/master-data/product/engineering/composables/useEngineering'

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

const toast = useToast()
const engineering = useEngineering(props.productId)

const showDeleteModal = ref(false)
const deleteConfirmStep = ref(0)

const deletingNode = ref<any | null>(null)

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

const handleDelete = (node: any) => {
  deletingNode.value = node
  deleteConfirmStep.value = 0
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (deleteConfirmStep.value === 0) {
    deleteConfirmStep.value = 1
    return
  }

  if (!deletingNode.value) return

  await engineering.deleteComponent(deletingNode.value.id)
  toast.add({
    title: 'Componente eliminado',
    description: 'El componente fue eliminado correctamente.',
    color: 'success'
  })
  showDeleteModal.value = false
  deletingNode.value = null
  deleteConfirmStep.value = 0
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
        <div>
          <p class="text-sm font-semibold">Método de cálculo</p>
          <p class="text-xs text-muted">Define cómo se interpretan las cantidades y dimensiones de los componentes.</p>
        </div>
      </template>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          v-for="option in filteredCostSourceOptions"
          :key="option.value"
          type="button"
          class="flex min-h-24 gap-3 rounded-lg border p-3 text-left transition"
          :class="form.cost_source === option.value
            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
            : 'border-default hover:bg-elevated'"
          @click="emit('update:costSource', option.value)"
        >
          <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated">
            <UIcon :name="costSourceDescriptions[option.value]?.icon ?? 'i-lucide-calculator'" class="size-4" />
          </div>
          <div>
            <p class="text-sm font-semibold">{{ costSourceDescriptions[option.value]?.label ?? option.label }}</p>
            <p class="mt-1 text-xs leading-relaxed text-muted">{{ costSourceDescriptions[option.value]?.description }}</p>
          </div>
        </button>
      </div>
    </UCard>

    <!-- ========================= -->
    <!-- ÁRBOL (BOM/ENGINEERING)   -->
    <!-- ========================= -->
    <template v-if="showTree">
      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold">{{ form.cost_source === 'ENGINEERING' ? 'Árbol de ingeniería' : 'Lista de materiales' }}</h2>
            <p class="text-xs text-muted">La jerarquía representa cómo se compone una unidad del producto terminado.</p>
          </div>
        </template>
        <EngineeringTree
          :productId="productId"
          :cost-source="form.cost_source"
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
    <!-- MODAL CONFIRMAR ELIMINAR  -->
    <!-- ========================= -->
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

          <div class="flex justify-end gap-2 pt-2 border-t border-default">
            <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">Cancelar</UButton>
            <UButton
              :color="deleteConfirmStep === 0 ? 'error' : 'error'"
              :variant="deleteConfirmStep === 0 ? 'outline' : 'solid'"
              :label="deleteConfirmStep === 0 ? 'Eliminar' : 'Confirmar eliminación'"
              :loading="engineering.loading.value"
              @click="confirmDelete"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
