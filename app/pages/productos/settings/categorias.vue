<script setup lang="ts">
import type { TreeItem } from '@nuxt/ui'
import type { Category } from '~/modulos/almacen/categories/types/categories.types'
import CategoryUpsertModal from '~/modulos/almacen/categories/components/CategoryUpsertModal.vue'
import CategoryTreeSortable from '~/modulos/almacen/categories/components/CategoryTreeSortable.vue'
import { useCategoriesStore } from '~/modulos/almacen/categories/store/categories.store'

const categoryStore = useCategoriesStore()

// =========================
// MODAL
// =========================

const modalOpen = ref(false)

const mode = ref<'create' | 'edit'>('create')

const form = ref<{
  id?: string
  name: string
  parent_id: string | null
}>({
  name: '',
  parent_id: null
})

// =========================
// TREE
// =========================

function categoryToTreeItem(cat: Category): TreeItem {
  return {
    label: cat.name,
    value: cat.id,
    children: cat.children?.map(categoryToTreeItem) ?? []
  }
}

const items = computed<TreeItem[]>(() =>
  (categoryStore.tree ?? []).map(categoryToTreeItem)
)

// =========================
// CREATE
// =========================

function openCreateRoot() {
  mode.value = 'create'

  form.value = {
    name: '',
    parent_id: null
  }

  modalOpen.value = true
}

function openCreateChild(parentId: string) {
  mode.value = 'create'

  form.value = {
    name: '',
    parent_id: parentId
  }

  modalOpen.value = true
}

// =========================
// EDIT
// =========================

function openEdit(category: Category) {
  mode.value = 'edit'

  form.value = {
    id: category.id,
    name: category.name,
    parent_id: category.parent_id ?? null
  }

  modalOpen.value = true
}

// =========================
// SUBMIT
// =========================

async function handleSubmit() {
  if (!form.value.name.trim()) return

  if (mode.value === 'create') {
    await categoryStore.create({
      name: form.value.name.trim(),
      parent_id: form.value.parent_id ?? undefined
    })
  } else {
    await categoryStore.update(form.value.id!, {
      name: form.value.name.trim()
    })
  }

  await categoryStore.fetchTree()

  modalOpen.value = false
}

// =========================
// MOVE
// =========================

async function handleMove(payload: {
  draggedId: string
  parentId: string | null
  newIndex: number
}) {
  await categoryStore.update(payload.draggedId, {
    parent_id: payload.parentId ?? undefined
  })

  await categoryStore.fetchTree()
}

// =========================
// INIT
// =========================

onMounted(() => {
  categoryStore.fetchTree()
})
</script>

<template>
  <UPageCard
    title="Categorías"
    description="Listado de categorías jerárquicas."
    orientation="horizontal"
    variant="naked"
    class="mb-2 mt-4 w-full lg:max-w-2xl mx-auto"
  >
    <UButton
      icon="i-heroicons-plus"
      label="Nueva categoría"
      color="neutral"
      class="w-fit lg:ms-auto"
      @click="openCreateRoot"
    />
  </UPageCard>

  <UPageCard variant="subtle" class="w-full lg:max-w-2xl mx-auto">
    <CategoryTreeSortable
      :items="items"
      @add="openCreateChild"
      @edit="openEdit"
      @move="handleMove"
    />
  </UPageCard>

  <CategoryUpsertModal
    v-model:open="modalOpen"
    v-model:form="form"
    :mode="mode"
    :loading="categoryStore.loading"
    @submit="handleSubmit"
  />
</template>
