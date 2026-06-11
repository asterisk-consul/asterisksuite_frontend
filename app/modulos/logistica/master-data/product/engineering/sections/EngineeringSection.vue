<script setup lang="ts">
import EngineeringTree from '~/modulos/logistica/master-data/product/engineering/components/EngineeringTree.vue'
import EngineeringComponentModal from '~/modulos/logistica/master-data/product/engineering/modals/EngineeringComponentModal.vue'

import {
  createDefaultProductForm,
  toCreateProductPayload
} from '~/modulos/logistica/master-data/product/utils/product-form.utils'

import { useEngineering } from '~/modulos/logistica/master-data/product/engineering/composables/useEngineering'
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import ProductModalForm from '~/modulos/logistica/master-data/product/components/modals/ProductModalForm.vue'

const form = reactive(createDefaultProductForm())
const props = defineProps<{
  productId: string
}>()

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
  deleteConfirmText.value = '' // limpiar al abrir
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
    <div class="flex items-center justify-between">
      <h2 class="font-medium">Árbol de ingeniería</h2>

      <div class="flex items-center justify-between gap-2">
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
