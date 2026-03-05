import type { BaseField } from '@/types/form.types'

export const vehicleCombinationFields: BaseField[] = [
  {
    name: 'companyId',
    type: 'hidden'
  },

  {
    name: 'tractorId',
    label: 'Tractor',
    type: 'select',
    options: []
  },

  {
    name: 'trailerId',
    label: 'Trailer',
    type: 'select',
    options: []
  },

  {
    name: 'validFrom',
    label: 'Válido desde',
    type: 'date'
  },

  {
    name: 'validUntil',
    label: 'Válido hasta',
    type: 'date'
  }
]
