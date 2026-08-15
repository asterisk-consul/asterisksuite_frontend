export interface LinkedUser {
  id: string
  name: string
  email: string
  active: boolean
}

export interface Employee {
  id: string
  party_id?: string | null
  user_id?: string | null
  first_name: string
  last_name: string
  document_type?: string | null
  document_number?: string | null
  position?: string | null
  department?: string | null
  hire_date?: string | null
  salary?: string | null
  currency_code: string
  default_commission_rate?: number | null
  is_active: boolean
  created_at?: string
  updated_at?: string | null
  user?: LinkedUser | null
  party?: {
    id: string
    name: string
    email?: string | null
    tax_id?: string | null
    vat_condition?: string | null
    exemption_rate?: number | null
    party_locations?: { location_id: string; label?: string | null; location?: { id: string; address?: string; city?: string; province?: string } }[]
    party_contacts?: { first_name: string; last_name: string; role?: string | null; phone?: string | null; email?: string | null }[]
    party_bank_accounts?: { cbu: string; alias?: string | null; bank_name?: string | null; account_type?: string | null; currency?: string | null; description?: string | null; holder_name?: string | null; is_default?: boolean }[]
  } | null
}

export interface CreateEmployeeInput {
  party_id?: string
  user_id?: string
  create_user?: {
    name: string
    email: string
    password: string
    role?: string
  }
  first_name: string
  last_name: string
  document_type?: string
  document_number?: string
  position?: string
  department?: string
  hire_date?: string
  salary?: string
  currency_code?: string
  default_commission_rate?: number
  is_active?: boolean
  // ─── Business party fields ──
  business_name?: string
  email?: string
  tax_id?: string
  vat_condition?: string
  exemption_rate?: number
  locations?: { location_id: string; label?: string }[]
  contacts?: { first_name: string; last_name: string; role?: string; phone?: string; email?: string }[]
  bank_accounts?: { cbu: string; alias?: string; bank_name?: string; account_type?: string; currency?: string; description?: string; holder_name?: string; is_default?: boolean }[]
}

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>
