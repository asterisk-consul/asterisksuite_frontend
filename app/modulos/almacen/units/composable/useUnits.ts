import { computed, type Ref } from 'vue'

import type { Unit } from '~/modulos/almacen/units/types/units.types'

export interface SelectMenuItem {
  label: string
  value: string
}

export enum UnitType {
  WEIGHT = 'WEIGHT',
  LENGTH = 'LENGTH',
  VOLUME = 'VOLUME',
  AREA = 'AREA',
  TIME = 'TIME',
  UNIT = 'UNIT'
}

export function useUnits(units?: Ref<Unit[]>) {
  // =========================
  // TIPOS DE UNIDAD
  // =========================

  const unitTypes = computed<SelectMenuItem[]>(() => [
    {
      label: 'Peso',
      value: UnitType.WEIGHT
    },
    {
      label: 'Longitud',
      value: UnitType.LENGTH
    },
    {
      label: 'Volumen',
      value: UnitType.VOLUME
    },
    {
      label: 'Unidad',
      value: UnitType.UNIT
    },
    {
      label: 'Área',
      value: UnitType.AREA
    },
    {
      label: 'Tiempo',
      value: UnitType.TIME
    }
  ])

  // =========================
  // LABEL HELPERS
  // =========================

  const getUnitTypeLabel = (type?: string | null) => {
    switch (type) {
      case UnitType.WEIGHT:
        return 'Peso'

      case UnitType.LENGTH:
        return 'Longitud'

      case UnitType.VOLUME:
        return 'Volumen'

      case UnitType.AREA:
        return 'Área'

      case UnitType.TIME:
        return 'Tiempo'
      case UnitType.UNIT:
        return 'Unidad'

      default:
        return '-'
    }
  }

  // =========================
  // UNIDADES
  // =========================

  const activeItems = computed(() =>
    (units?.value ?? []).filter((i) => i.active !== false)
  )

  const items = computed<SelectMenuItem[]>(() =>
    activeItems.value.map((unit) => ({
      label: unit.name,
      value: unit.id
    }))
  )

  return {
    items,
    unitTypes,
    getUnitTypeLabel
  }
}
