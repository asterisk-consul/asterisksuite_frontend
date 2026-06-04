import { computed } from 'vue'
import { useProductsStore } from '../store/products.store'
import type {
  CreateProductInput,
  UpdateProductInput
} from '~/modulos/logistica/master-data/product/types/product.types'

export interface ProductSelectItem {
  label: string
  value: string
  price: number
  hasCostTemplate: boolean
  tax?: {
    id: string
    rate: number
  }
}

export interface SelectItem {
  label: string
  value: string
}

export function useProducts() {
  const store = useProductsStore()

  // =========================
  // INIT
  // =========================

  const init = async () => {
    await store.fetchAll()
  }

  // =========================
  // ACTIONS
  // =========================

  const create = async (payload: CreateProductInput) => store.create(payload)

  const update = async (id: string, payload: UpdateProductInput) => store.update(id, payload)

  const remove = async (id: string) => store.remove(id) // ✅ store.delete → store.remove

  // =========================
  // COMPUTED
  // =========================

  const items = computed<ProductSelectItem[]>(() =>
    store.items.map((product) => {
      const price = product.product_price?.[0]?.price ?? 0
      const tax = product.product_taxes?.[0]

      return {
        label: `${product.sku} - ${product.name}`,
        value: product.id,
        price,
        hasCostTemplate: !!product.cost_template_id,
        tax: tax
          ? {
              id: tax.id,
              rate: tax.rate
            }
          : undefined
      }
    })
  )

  const selectItems = computed<SelectItem[]>(() =>
    store.items.map((product) => ({
      label: `${product.sku} - ${product.name}`,
      value: product.id
    }))
  )

  const withCostTemplate = computed(() => store.items.filter((p) => !!p.cost_template_id))

  const withCostTemplateIds = computed(() => new Set(withCostTemplate.value.map((p) => p.id)))

  // =========================
  // HELPERS
  // =========================

  const hasCostTemplate = (productId: string) => withCostTemplateIds.value.has(productId)

  const formatLabel = (productId: string) => {
    const product = store.items.find((p) => p.id === productId)
    return product ? `${product.sku} - ${product.name}` : ''
  }

  const findById = (id: string) => store.items.find((p) => p.id === id)

  const loadOne = async (id: string) => store.fetchOne(id)

  const getProduct = async (id: string) => {
    const local = findById(id)
    if (local) return local
    return await store.fetchOne(id)
  }

  // =========================
  // RETURN
  // =========================

  return {
    // state
    products: computed(() => store.items),
    current: computed(() => store.current),
    roots: computed(() => store.roots),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    total: computed(() => store.items.length),

    // computed
    items,
    selectItems,
    withCostTemplate,
    withCostTemplateIds,

    // helpers
    hasCostTemplate,
    formatLabel,
    findById,
    loadOne,
    getProduct,

    // actions
    init,
    create,
    update,
    remove,
    patchTags: store.patchTags,
    patchCategories: store.patchCategories,
    fetchRootProducts: (id: string) => store.fetchRootProducts(id)
  }
}
