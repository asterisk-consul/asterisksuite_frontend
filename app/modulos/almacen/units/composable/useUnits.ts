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
  QUANTITY = 'QUANTITY',
  AREA = 'AREA',
  TIME = 'TIME'
}

export function useUnits(units?: Ref<Unit[]>) {
  // =========================
  // UNIDADES
  // =========================

  const items = computed<SelectMenuItem[]>(() =>
    units.value.map((unit) => ({
      label: unit.name,
      value: unit.id
    }))
  )

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
      label: 'Cantidad',
      value: UnitType.QUANTITY
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

      case UnitType.QUANTITY:
        return 'Cantidad'

      case UnitType.AREA:
        return 'Área'

      case UnitType.TIME:
        return 'Tiempo'

      default:
        return '-'
    }
  }

  return {
    items,
    unitTypes,
    getUnitTypeLabel
  }
}
