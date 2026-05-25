import { computed, type Ref } from 'vue'

import type { Attribute } from '~/modulos/almacen/attributes/types/attributes.types'

export interface SelectMenuItem {
  label: string
  value: string
}

export enum AttributeType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN'
}

export function useAtributtes(attribute?: Ref<Attribute[]>) {
  // =========================
  // TIPOS DE UNIDAD
  // =========================

  const attributeTypes = computed<SelectMenuItem[]>(() => [
    {
      label: 'Texto',
      value: AttributeType.TEXT
    },
    {
      label: 'Numérico',
      value: AttributeType.NUMBER
    },
    {
      label: 'Booleano',
      value: AttributeType.BOOLEAN
    }
  ])

  // =========================
  // LABEL HELPERS
  // =========================

  const getUnitTypeLabel = (type?: string | null) => {
    switch (type) {
      case AttributeType.TEXT:
        return 'Texto'

      case AttributeType.NUMBER:
        return 'Numérico'

      case AttributeType.BOOLEAN:
        return 'Booleano'

      default:
        return '-'
    }
  }

  // =========================
  // UNIDADES
  // =========================

  const activeItems = computed(() =>
    (attribute?.value ?? []).filter((i) => i.active !== false)
  )

  const items = computed<SelectMenuItem[]>(() =>
    activeItems.value.map((unit) => ({
      label: unit.name,
      value: unit.id
    }))
  )

  return {
    items,
    activeItems,
    getUnitTypeLabel
  }
}
