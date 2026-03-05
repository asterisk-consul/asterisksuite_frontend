import type { Vehicle } from './vehicles'

export interface VehicleCombination {
  id: string
  company_id: string
  tractor_id: string
  trailer_id: string | null
  valid_from: string
  valid_until: string | null
  created_by: string | null
  created_at: string

  tractor: Vehicle
  trailer: Vehicle | null

  trips?: any[]
}

export interface CreateVehicleCombinationInput {
  companyId: string
  tractorId: string
  trailerId?: string
  validFrom: string
  validUntil?: string
  createdBy?: string
}

export interface UpdateVehicleCombinationInput {
  validUntil?: string
}
