export interface VehicleDocument {
  id: string
  document_type_id: string
  expiration_date: string | null
  transport_document_types: {
    id: string
    name: string
    entity: 'VEHICLE'
    active: boolean
  }
}

export interface Vehicle {
  id: string
  company_id: string
  type: string
  plate: string
  brand: string
  model: string
  year: number
  max_weight: number
  max_volume: number
  refrigeration: boolean
  active: boolean
  created_at: string
  vehicleDocuments: VehicleDocument[]
}

export interface CreateVehicleDocumentInput {
  documentTypeId: string
  expirationDate?: string
}

export interface CreateVehicleInput {
  companyId: string
  type: string
  plate: string
  brand: string
  model: string
  year: number
  maxWeight: number
  maxVolume: number
  refrigeration?: boolean
  documents?: CreateVehicleDocumentInput[]
}

export interface UpdateVehicleDocumentInput {
  id?: string
  documentTypeId?: string
  expirationDate?: string
  remove?: boolean
}

export interface UpdateVehicleInput {
  type?: string
  brand?: string
  model?: string
  year?: number
  maxWeight?: number
  maxVolume?: number
  refrigeration?: boolean
  active?: boolean
  documents?: UpdateVehicleDocumentInput[]
}
