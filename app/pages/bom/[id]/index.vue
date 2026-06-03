<script setup lang="ts">
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'

import BomSidebar from '~/modulos/logistica/master-data/product/costing/components/BomSidebar.vue'
import BomTabsCard from '~/modulos/logistica/master-data/product/costing/components/BomTabsCard.vue'

import EngineeringTree from '~/modulos/logistica/master-data/product/engineering/components/EngineeringTree.vue'

definePageMeta({
  middleware: ['auth'],
  layout: 'modulofabricacion'
})

const route = useRoute()

const { moduleCollapsed } = useModuleSidebarState()

const mobileOpen = ref(false)

watch(moduleCollapsed, (collapsed) => {
  if (!collapsed && window.innerWidth < 1024) {
    mobileOpen.value = true
    moduleCollapsed.value = true
  }
})

watch(mobileOpen, (open) => {
  if (!open) {
    moduleCollapsed.value = true
  }
})

const productId = route.params.id as string

const { loading, findById } = useProducts()

const product = computed(() => findById(productId))

onMounted(async () => {
  if (!product.value) {
    await findById(productId)
  }
})

useHead({
  title: computed(() => product.value?.name ?? 'BOM')
})

watch(
  product,
  (value) => {
    if (!value) return

    route.meta.breadcrumb = [
      {
        label: 'Fabricación',
        to: '/fabricacion'
      },
      {
        label: 'BOM',
        to: '/bom'
      },
      {
        label: value.name,
        to: `/bom/${value.id}`
      }
    ]
  },
  {
    immediate: true
  }
)

const activeTab = ref('general')

const saving = ref(false)

async function handleSave() {
  saving.value = true

  try {
    //
  } finally {
    saving.value = false
  }
}

const showTemplateSelector = ref(false)
const showAddComponent = ref(false)
const showDeleteModal = ref(false)

const selectedParent = ref<any | null>(null)
const editingNode = ref<any | null>(null)
const nodeToDelete = ref<any | null>(null)

const handleAddComponent = (parentNode: any | null) => {
  selectedParent.value = parentNode
  editingNode.value = null

  showAddComponent.value = true
}

const handleEditComponent = (node: any) => {
  editingNode.value = node

  showAddComponent.value = true
}

const handleDeleteComponent = (node: any) => {
  nodeToDelete.value = node
  showDeleteModal.value = true
}
</script>

<template>
  <div class="flex flex-col h-full">
    <AppPageHeader
      :title="product?.name ?? 'BOM'"
      :description="product?.sku ?? ''"
      :loading="loading"
      show-module-toggle
      class="sticky top-0 z-20 px-4 border-b border-default bg-default"
    >
      <template #right>
        <div class="flex items-center gap-2">
          <UButton label="Actualizar Costos" variant="soft" color="neutral" />

          <UButton label="Ver BOM" variant="soft" color="neutral" />

          <UButton label="Guardar" icon="i-lucide-save" :loading="saving" @click="handleSave" />
        </div>
      </template>
    </AppPageHeader>

    <UPage>
      <template v-if="!moduleCollapsed" #left>
        <BomSidebar :product="product ?? null" :mobile-open="mobileOpen" @update:mobile-open="mobileOpen = $event" />
      </template>

      <div class="h-full p-4">
        <BomTabsCard v-model:active-tab="activeTab">
          <template #default="{ activeTab }">
            <template v-if="activeTab === 'general'">Generala</template>

            <template v-else-if="activeTab === 'ingenieria'">
              <div class="mt-4 space-y-4">
                <div class="flex items-center justify-between">
                  <h2 class="text-xl font-semibold">Árbol de ingeniería</h2>
                  <UButton size="sm" variant="outline" icon="i-heroicons-plus" @click="showAddComponent = true">
                    Agregar componente
                  </UButton>
                </div>

                <UCard>
                  <EngineeringTree
                    :product-id="productId"
                    @add-child="handleAddComponent"
                    @edit-node="handleEditComponent"
                    @delete-node="handleDeleteComponent"
                  />
                </UCard>
              </div>
            </template>

            <template v-else-if="activeTab === 'costos'">Costos</template>
          </template>
        </BomTabsCard>
      </div>
    </UPage>
  </div>
</template>
