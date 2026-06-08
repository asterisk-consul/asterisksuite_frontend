import { computed, type Ref } from 'vue'
import type { ProductVariant } from '~/modulos/logistica/master-data/product-variants/types/product-variants.types'

export interface SelectMenuItem {
  label: string
  value: string
}

export function useBusinessParties(variants: Ref<ProductVariant[]>) {
  const items = computed<SelectMenuItem[]>(() =>
    variants.value
      .filter((variant) => variant.name)
      .map((variant) => ({
        label: variant.name!,
        value: variant.id
      }))
  )

  return {
    items
  }
}
