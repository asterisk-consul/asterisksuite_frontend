<script setup lang="ts">
import EngineeringTree from '~/modulos/logistica/master-data/product/engineering/components/EngineeringTree.vue'
import EngineeringComponentModal from '~/modulos/logistica/master-data/product/engineering/modals/EngineeringComponentModal.vue'

import { useEngineering } from '~/modulos/logistica/master-data/product/engineering/composables/useEngineering'

const props = defineProps<{
  productId: string
}>()

const toast = useToast()
const engineering = useEngineering(props.productId)
const showModal = ref(false)
const selectedParent = ref<any | null>(null)
const editingNode = ref<any | null>(null)
const showDeleteModal = ref(false)
const deletingNode = ref<any | null>(null)
const deleteConfirmText = ref('')

const handleAdd = (parent: any | null) => {
  selectedParent.value = parent.child_product_id
  editingNode.value = null

  showModal.value = true
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

const handleSaved = async () => {
  await engineering.loadTree()

  showModal.value = false

  selectedParent.value = null
  editingNode.value = null
}
onMounted(async () => {
  await engineering.loadTree()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="font-medium">Árbol de ingeniería</h2>

      <UButton label="Agregar componente" icon="i-lucide-plus" size="sm" @click="handleAdd(props.productId)" />
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
