<script setup lang="ts">
import type { Category } from '~/modulos/almacen/categories/types/categories.types'
import { useProductCategoriesStore } from '~/modulos/logistica/master-data/product-categories/store/product-categories.store'
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
import { useCategoriesStore } from '~/modulos/almacen/categories/store/categories.store'
import { useCategories } from '~/modulos/almacen/categories/composable/useCategories'
import CategoryUpsertModal from '~/modulos/almacen/categories/components/CategoryUpsertModal.vue'

const props = withDefaults(
  defineProps<{
    categories?: Category[]
  }>(),
  {
    categories: () => []
  }
)

const model = defineModel<string[]>({ default: [] })

const productCategoriesStore = useProductCategoriesStore()
const productsStore = useProductsStore()
const categoriesStore = useCategoriesStore()

const isModalOpen = ref(false)

const isEdit = computed(() => !!productsStore.current)

const categoriesSource = computed(() =>
  props.categories.length ? props.categories : categoriesStore.items
)

const { items: options } = useCategories(categoriesSource)

onMounted(async () => {
  if (!props.categories.length) {
    await categoriesStore.fetchAll()
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
    ...toAssign.map((categoryId) =>
      productCategoriesStore.assign({
        product_id: productId,
        category_id: categoryId
      })
    ),
    ...toRemove.map((categoryId) =>
      productCategoriesStore.remove(productId, categoryId)
    )
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
    placeholder="Seleccionar categorías"
    class="w-full"
    @update:model-value="handleChange"
  >
    <template #content-bottom>
      <div class="border-t border-(--ui-border) p-1">
        <UButton
          label="Nueva categoría"
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

  <CategoryUpsertModal v-model:open="isModalOpen" />
</template>
