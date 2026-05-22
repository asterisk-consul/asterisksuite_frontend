export enum UnitType {
  WEIGHT = 'WEIGHT',
  LENGTH = 'LENGTH',
  VOLUME = 'VOLUME',
  QUANTITY = 'QUANTITY',
  AREA = 'AREA',
  TIME = 'TIME'
}

export interface Unit {
  id: string

  name: string
  symbol: string

  unit_type: UnitType

  active?: boolean

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface CreateUnitInput {
  name: string

  symbol: string

  unit_type: UnitType

  active?: boolean
}

export interface UpdateUnitInput
  extends Partial<CreateUnitInput> {}
