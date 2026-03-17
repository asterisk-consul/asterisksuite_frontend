export interface PartyContact {
  id: string
  party_id?: string

  first_name: string
  last_name: string

  role?: string
  phone?: string
  email?: string

  created_at: string
  updated_at?: string
}

export type CreatePartyContactDto = Omit<
  PartyContact,
  'id' | 'created_at' | 'updated_at'
>

export type UpdatePartyContactDto = Partial<CreatePartyContactDto>
