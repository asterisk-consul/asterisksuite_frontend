import { computed, type Ref } from 'vue'
import type { Product } from '~/modulos/logistica/master-data/product/types/product.types'

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

export function useProducts(products: Ref<Product[]>) {
  const items = computed<ProductSelectItem[]>(() =>
    products.value.map((product) => {
      const price = product.product_price?.[0]?.price ?? 0
      const tax = product.product_taxes?.[0]

      return {
        label: `${product.sku} - ${product.name}`,
        value: product.id,
        price,
        tax: tax
          ? {
              id: tax.id,
              rate: tax.rate
            }
          : undefined
      }
    })
  )
  const total = computed(() => items.value.length)

  const productos = computed<SelectItem[]>(() =>
    products.value.map((product) => {
      const price = product.product_price?.[0]?.price ?? 0
      const tax = product.product_taxes?.[0]

      return {
        label: `${product.sku} - ${product.name}`,
        value: product.id
      }
    })
  )

  return { items, total, productos }
}
