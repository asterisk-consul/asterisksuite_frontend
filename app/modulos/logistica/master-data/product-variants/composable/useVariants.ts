import { computed } from 'vue'
import { useProductVariantsStore } from '../store/product-variants.store'
export interface SelectMenuItem {
  label: string
  value: string
}

import type {
  CreateProductVariantInput,
  UpdateProductVariantInput
} from '~/modulos/logistica/master-data/product-variants/types/product-variants.types'

export function useProductVariants() {
  const store = useProductVariantsStore()

  // =========================
  // INIT / LOADERS
  // =========================

  const init = async () => {
    await store.fetchAll()
  }

  const loadOne = async (id: string) => {
    return await store.fetchOne(id)
  }

  const loadByProduct = async (productId: string) => {
    return await store.fetchByProduct(productId)
  }

  // =========================
  // ACTIONS
  // =========================

  const create = async (payload: CreateProductVariantInput) => {
    return await store.create(payload)
  }

  const update = async (id: string, payload: UpdateProductVariantInput) => {
    return await store.update(id, payload)
  }

  const remove = async (id: string) => {
    return await store.remove(id)
  }

  // =========================
  // COMPUTED (UI LAYER)
  // =========================

  const items = computed(() => store.items)

  const current = computed(() => store.current)

  const loading = computed(() => store.loading)

  const activeItems = computed(() => store.activeItems)

  const variantsWithSku = computed(() => store.variantsWithSku)

  const selectItems = computed<SelectMenuItem[]>(() =>
    items.value
      .filter((variant) => typeof variant.name === 'string' && variant.name.trim() !== '')
      .map((variant) => ({
        label: variant.name!, // 👈 garantizas string aquí
        value: variant.id
      }))
  )

  // =========================
  // HELPERS
  // =========================

  const findById = (id: string) => store.items.find((v) => v.id === id)

  const formatLabel = (id: string) => {
    const v = findById(id)
    return v ? `${v.sku ?? ''} - ${v.name ?? ''}`.trim() : ''
  }

  const hasSku = (id: string) => {
    const v = findById(id)
    return !!v?.sku
  }

  // =========================
  // RETURN API
  // =========================

  return {
    // state
    items,
    current,
    loading,

    // computed
    activeItems,
    variantsWithSku,
    selectItems,

    // actions
    init,
    loadOne,
    loadByProduct,
    create,
    update,
    remove,

    // helpers
    findById,
    formatLabel,
    hasSku
  }
}
