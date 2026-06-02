import { computed } from 'vue'
import { useProductsStore } from '../store/products.store'

export interface ProductSelectItem {
  label: string
  value: string
  price: number
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
        tax: tax ? { id: tax.id, rate: tax.rate } : undefined
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
  // UTILS
  // =========================

  const hasCostTemplate = (productId: string) => withCostTemplateIds.value.has(productId)

  const formatLabel = (productId: string) => {
    const product = store.items.find((p) => p.id === productId)
    return product ? `${product.sku} - ${product.name}` : ''
  }

  return {
    // store state
    products: computed(() => store.items),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    total: computed(() => store.items.length),

    // computed
    items,
    selectItems,
    withCostTemplate,
    withCostTemplateIds,

    // utils
    hasCostTemplate,
    formatLabel,

    // actions
    init
  }
}
