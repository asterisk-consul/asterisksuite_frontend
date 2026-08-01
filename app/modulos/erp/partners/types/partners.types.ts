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
  party?: { id: string; name: string } | null
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
}

export type UpdatePartnerInput = Partial<CreatePartnerInput>
