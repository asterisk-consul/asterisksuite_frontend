export interface Partner {
  id: string
  party_id?: string | null
  user_id?: string | null
  first_name: string
  last_name: string
  document_type?: string | null
  document_number?: string | null
  share_percentage?: string | null
  capital_contributed?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string | null
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

export interface CreatePartnerInput {
  party_id?: string
  user_id?: string
  first_name: string
  last_name: string
  document_type?: string
  document_number?: string
  share_percentage?: string
  capital_contributed?: string
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

export type UpdatePartnerInput = Partial<CreatePartnerInput>
