<script setup lang="ts">
import EngineeringTree from '~/modulos/logistica/master-data/product/engineering/components/EngineeringTree.vue'
import EngineeringComponentModal from '~/modulos/logistica/master-data/product/engineering/modals/EngineeringComponentModal.vue'

import { useEngineering } from '~/modulos/logistica/master-data/product/engineering/composables/useEngineering'

const props = defineProps<{
  productId: string
}>()

const engineering = useEngineering(props.productId)

const showModal = ref(false)

const selectedParent = ref<any | null>(null)

const editingNode = ref<any | null>(null)

const handleAdd = (parent: any | null) => {
  selectedParent.value = parent
  editingNode.value = null

  showModal.value = true
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
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="font-medium">Árbol de ingeniería</h2>

      <UButton label="Agregar componente" icon="i-lucide-plus" size="sm" @click="handleAdd(null)" />
    </div>

    <UCard>
      <EngineeringTree :product-id="productId" @add-child="handleAdd" @edit-node="handleEdit" />
    </UCard>

    <EngineeringComponentModal
      v-model:open="showModal"
      :product-id="productId"
      :component="editingNode"
      @saved="handleSaved"
    />
  </div>
</template>
