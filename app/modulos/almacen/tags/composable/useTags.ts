import { computed, type Ref } from 'vue'

import type { Tag } from '~/modulos/almacen/tags/types/tags.types'
export interface SelectMenuItem {
  label: string
  value: string
}

export function useTags(tags?: Ref<Tag[]>) {
  // =========================
  // TAGS
  // =========================

  const activeItems = computed(() =>
    (tags?.value ?? []).filter((i) => i.active !== false)
  )

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
