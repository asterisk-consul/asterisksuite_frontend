// business-parties.types.ts

export type BusinessPartyType = 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'PARTNER'

// ------------------
// LOCATION
// ------------------
export interface PartyLocation {
  id?: string
  location_id: string | null
  label?: string

  // include
  location?: {
    id: string
    address?: string
    city?: string
  }
}

// ------------------
// CONTACT
// ------------------
export interface PartyContact {
  id?: string
  first_name: string
  last_name: string
  role?: string
  phone?: string
  email?: string
}

// ------------------
// ENTITY
// ------------------
export interface BusinessParty {
  id: string

  type: BusinessPartyType
  name: string
  business_names?: string
  document_type?: string
  document_number?: string
  address?: string
  tax_id?: string
  vat_condition: string
  exemption_rate: number

  email?: string
  alias: string
  cbu: string
  active?: boolean
  created_at?: string

  party_locations?: PartyLocation[]
  party_contacts?: PartyContact[]
}

// ------------------
// INPUTS (API)
// ------------------
export type CreateBusinessPartyInput = {
  type: BusinessPartyType
  name: string
  business_names?: string
  document_type?: string
  document_number?: string
  address?: string
  tax_id?: string
  vat_condition: string
  exemption_rate: number

  email?: string
  alias: string
  cbu: string

  active?: boolean

  locations?: {
    location_id: string
    label?: string
  }[]

  contacts?: {
    first_name: string
    last_name: string
    role?: string
    phone?: string
    email?: string
  }[]
}

export type UpdateBusinessPartyInput = Partial<CreateBusinessPartyInput>

// ------------------
// FORM
// ------------------
export interface BusinessPartyForm {
  id?: string
  type: BusinessPartyType
  name: string
  business_names?: string
  document_type?: string
  document_number?: string
  address?: string
  tax_id?: string
  vat_condition: string
  exemption_rate: number

  email?: string
  alias: string
  cbu: string
  active?: boolean

  locations: {
    location_id: string
    label?: string
  }[]

  contacts: {
    first_name: string
    last_name: string
    role?: string
    phone?: string
    email?: string
  }[]
}
