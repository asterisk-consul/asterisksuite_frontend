export type CommercialAdjustmentScope = 'SALES' | 'PURCHASES' | 'BOTH'
export type CommercialAdjustmentValueType = 'PERCENTAGE' | 'AMOUNT'
export type CommercialAdjustmentBasis = 'NET' | 'GROSS'

export interface CommercialAdjustmentConcept {
  id: string
  name: string
  description: string | null
  applies_to: CommercialAdjustmentScope
  value_type: CommercialAdjustmentValueType
  basis: CommercialAdjustmentBasis
  default_value: number | string | null
  is_active: boolean
  sort_order: number
}

export type CommercialAdjustmentConceptInput = Omit<
  CommercialAdjustmentConcept,
  'id' | 'default_value' | 'is_active'
> & {
  default_value: number | null
  is_active?: boolean
}
