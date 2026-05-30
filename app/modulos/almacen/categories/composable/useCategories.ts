import { computed, type Ref } from 'vue'

import type { Category } from '~/modulos/almacen/categories/types/categories.types'
export interface SelectMenuItem {
  label: string
  value: string
}

export function useCategories(categories?: Ref<Category[]>) {
  // =========================
  // TAGS
  // =========================

  const activeItems = computed(() => (categories?.value ?? []).filter((i) => i.active !== false))

  const items = computed<SelectMenuItem[]>(() =>
    activeItems.value.map((unit) => ({
      label: unit.name,
      value: unit.id
    }))
  )

  return {
    items,
    activeItems
  }
}
