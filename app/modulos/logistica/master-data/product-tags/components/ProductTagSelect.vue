<script setup lang="ts">
import type { ProductTag } from '~/modulos/logistica/master-data/product-tags/types/product-tags.types'
import { useProductTagsStore } from '~/modulos/logistica/master-data/product-tags/store/product-tags.store'
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
import { useTagsStore } from '~/modulos/almacen/tags/store/tags.store' // ← agregás esto
import { useTags } from '~/modulos/almacen/tags/composable/useTags'
import TagModal from '~/modulos/almacen/tags/components/TagModal.vue'

const props = defineProps<{
  tags: ProductTag[]
}>()

const model = defineModel<string[]>({ default: [] })

const productTagsStore = useProductTagsStore()
const productsStore = useProductsStore()
const tagsStore = useTagsStore() // ← agregás esto

const isModalOpen = ref(false)

const isEdit = computed(() => !!productsStore.current)

const mappedTags = computed(() =>
  (props.tags ?? []).flatMap((pt) => (pt.tags ? [pt.tags] : []))
)

// Si hay tags del producto usá esos, sino usá todos los de la store
const tagsSource = computed(() =>
  mappedTags.value.length ? mappedTags.value : tagsStore.items
)

const { items: options } = useTags(tagsSource)

// Fetchea todos los tags al montar por si no vienen con el producto
onMounted(async () => {
  if (!mappedTags.value.length) {
    await tagsStore.fetchAll()
  }
})

async function handleChange(newIds: string[]) {
  if (!isEdit.value || !productsStore.current) {
    model.value = newIds
    return
  }

  const productId = productsStore.current.id
  const previous = new Set(model.value)
  const next = new Set(newIds)

  const toAssign = newIds.filter((id) => !previous.has(id))
  const toRemove = model.value.filter((id) => !next.has(id))

  await Promise.all([
    ...toAssign.map((tagId) => productTagsStore.assign(productId, tagId)),
    ...toRemove.map((tagId) => productTagsStore.remove(productId, tagId))
  ])

  model.value = newIds
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
      <div class="border-t border-(--ui-border) p-1">
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
