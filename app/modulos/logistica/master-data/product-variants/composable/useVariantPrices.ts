import { computed } from 'vue'
import { useVariantPriceStore } from '../store/variant-price.store'

export function useVariantPrices() {
  const store = useVariantPriceStore()

  const items = computed(() => store.items)
  const loading = computed(() => store.loading)
  const error = computed(() => store.error)

  const fetchByProduct = async (productId: string) => {
    return store.fetchByProduct(productId)
  }

  const fetchByVariant = async (variantId: string) => {
    return store.fetchByVariant(variantId)
  }

  const create = async (data: {
    variant_id: string
    currency_id: string
    price: number
    price_list?: string
    margin?: number
    active?: boolean
  }) => {
    return store.create(data)
  }

  const update = async (id: string, data: Partial<{
    variant_id: string
    currency_id: string
    price: number
    price_list?: string
    margin?: number
    active?: boolean
  }>) => {
    return store.update(id, data)
  }

  const remove = async (id: string) => {
    return store.remove(id)
  }

  const getHistory = async (id: string) => {
    return store.getHistory(id)
  }

  return {
    items,
    loading,
    error,
    fetchByProduct,
    fetchByVariant,
    create,
    update,
    remove,
    getHistory,
  }
}
