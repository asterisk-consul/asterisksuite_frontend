<script lang="ts" setup>
import TagsList from '~/modulos/almacen/tags/components/TagsList.vue'

import TagModal from '~/modulos/almacen/tags/components/TagModal.vue'

import { useTagsStore } from '~/modulos/almacen/tags/store/tags.store'

import type { Tag } from '~/modulos/almacen/tags/types/tags.types'

definePageMeta({
  middleware: ['auth']
})

useSeoMeta({
  title: 'Tags'
})

const toast = useToast()

const tagsStore = useTagsStore()

const loading = computed(() => tagsStore.loading)

const tags = computed(() => tagsStore.items)

const openModal = ref(false)

const selectedTag = ref<Tag | null>(null)

const createTag = () => {
  selectedTag.value = null

  openModal.value = true
}

const editTag = (tag: Tag) => {
  selectedTag.value = tag

  openModal.value = true
}

const toggleTag = async (tag: Tag) => {
  try {
    await tagsStore.update(tag.id, {
      active: !tag.active
    })

    toast.add({
      title: tag.active ? 'Tag desactivado' : 'Tag activado',

      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: tagsStore.error || 'Error al actualizar estado',

      color: 'error'
    })
  }
}

onMounted(async () => {
  await tagsStore.fetchAll()
})
</script>

<template>
  <UPageCard
    title="Tags"
    description="Listado de tags."
    orientation="horizontal"
    variant="naked"
    class="mb-2 mt-4 w-full lg:max-w-2xl mx-auto"
  >
    <UButton
      icon="i-heroicons-plus"
      label="Nuevo tag"
      color="neutral"
      class="w-fit lg:ms-auto"
      @click="createTag"
    />
  </UPageCard>

  <UPageCard variant="subtle" class="w-full lg:max-w-2xl mx-auto">
    <TagsList
      :tags="tags"
      :loading="loading"
      @edit="editTag"
      @toggle="toggleTag"
    />
  </UPageCard>

  <TagModal v-model:open="openModal" :tag="selectedTag" />
</template>
