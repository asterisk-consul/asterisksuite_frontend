// business-parties.types.ts

export type BusinessPartyType =
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'EMPLOYEE'
  | 'PARTNER'
  | 'TAX_AUTHORITY'
  | 'UTILITY'
  | 'FINANCIAL'
  | 'SERVICE_PROVIDER'

// ------------------
// BANK ACCOUNT
// ------------------
export interface PartyBankAccount {
  id?: string
  cbu: string
  alias?: string
  bank_name?: string
  account_type?: string
  currency?: string
  description?: string
  holder_name?: string
  is_default?: boolean
  active?: boolean
}

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
    province?: string
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
  email?: string
  tax_id?: string
  vat_condition: string
  exemption_rate: number
  active?: boolean
  created_at?: string

  party_locations?: PartyLocation[]
  party_contacts?: PartyContact[]
  party_bank_accounts?: PartyBankAccount[]
}

// ------------------
// INPUTS (API) - must match backend CreateBusinessPartyDto
// ------------------
export type CreateBusinessPartyInput = {
  type: BusinessPartyType
  name: string
  business_names?: string
  document_type?: string
  email?: string
  tax_id?: string
  vat_condition?: string
  exemption_rate?: number

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

  bank_accounts?: {
    cbu: string
    alias?: string
    bank_name?: string
    account_type?: string
    currency?: string
    description?: string
    holder_name?: string
    is_default?: boolean
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
  first_name?: string
  last_name?: string
  business_names?: string
  document_type?: string
  email?: string
  tax_id?: string
  vat_condition: string
  exemption_rate: number
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

  bank_accounts: {
    cbu: string
    alias?: string
    bank_name?: string
    account_type?: string
    currency?: string
    description?: string
    holder_name?: string
    is_default?: boolean
  }[]

  // ─── Employee fields (optional, shown when type=EMPLOYEE) ──
  position?: string
  department?: string
  hire_date?: string
  salary?: string
  currency_code?: string
  default_commission_rate?: number

  // ─── Partner fields (optional, shown when type=PARTNER) ──
  share_percentage?: string
  capital_contributed?: string
}
