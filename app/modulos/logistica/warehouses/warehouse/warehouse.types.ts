export interface Warehouse {
  id: string
  companyId: string
  locationId?: string | null
  unitId?: string | null
  name: string
  code?: string | null
  active: boolean
  createdAt: string // Date serializada desde backend (ISO string)
  units?: {
    id: string
    name: string
    symbol: string
    unit_type: string
  } | null
  locations?: {
    id: string
    address?: string | null
    city?: string | null
    province?: string | null
    country?: string | null
  } | null
}

export interface CreateWarehouseInput {
  name: string
  code?: string
  locationId?: string
  unitId?: string
  active?: boolean
}
export type UpdateWarehouseInput = Partial<CreateWarehouseInput>
