<script setup lang="ts">
import type { ProductTag } from '~/modulos/logistica/master-data/product-tags/types/product-tags.types'

import { useProductTagsStore } from '~/modulos/logistica/master-data/product-tags/store/product-tags.store'
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
import { useTagsStore } from '~/modulos/almacen/tags/store/tags.store'
import { useTags } from '~/modulos/almacen/tags/composable/useTags'

import TagModal from '~/modulos/almacen/tags/components/TagModal.vue'

const props = defineProps<{
  tags: ProductTag[]
  productId?: string
}>()

const emit = defineEmits<{
  selected: []
  cancel: []
}>()

const model = defineModel<string[]>({ default: [] })

const productTagsStore = useProductTagsStore()
const productsStore = useProductsStore()
const tagsStore = useTagsStore()

const isModalOpen = ref(false)

const currentProductId = computed(() => props.productId ?? productsStore.current?.id)

const isEdit = computed(() => !!currentProductId.value)

const { items: options } = useTags(computed(() => tagsStore.items))

// reemplazá el onMounted por esto
onMounted(async () => {
  await tagsStore.fetchAll()
})

watch(
  () => props.tags,
  (newTags) => {
    model.value = newTags.map((pt) => pt.tag_id)
  },
  { immediate: true } // esto reemplaza la inicialización del onMounted
)

async function handleChange(newIds: string[]) {
  if (!isEdit.value || !currentProductId.value) {
    model.value = newIds
    emit('selected')
    return
  }

  const previous = new Set(model.value)
  const next = new Set(newIds)

  const toAssign = newIds.filter((id) => !previous.has(id))
  const toRemove = model.value.filter((id) => !next.has(id))

  await Promise.all([
    ...toAssign.map((tagId) => productTagsStore.assign(currentProductId.value!, tagId)),
    ...toRemove.map((tagId) => productTagsStore.remove(currentProductId.value!, tagId))
  ])

  model.value = newIds

  emit('selected')
}
</script>

<template>
  <USelectMenu
    :model-value="model"
    :items="options"
    value-key="value"
    multiple
    placeholder="Seleccionar tags"
    class="w-full"
    @update:model-value="handleChange"
  >
    <template #content-bottom>
      <div class="border-t border-neutral-50 p-1 space-y-1">
        <UButton
          label="Cancelar"
          icon="i-lucide-x"
          variant="ghost"
          color="neutral"
          size="sm"
          block
          @click="emit('cancel')"
        />

        <UButton
          label="Nuevo tag"
          icon="i-lucide-plus"
          variant="ghost"
          color="neutral"
          size="sm"
          block
          @click="isModalOpen = true"
        />
      </div>
    </template>
  </USelectMenu>

  <TagModal v-model:open="isModalOpen" />
</template>
