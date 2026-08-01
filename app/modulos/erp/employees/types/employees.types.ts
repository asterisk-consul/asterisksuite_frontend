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
  is_active: boolean
  created_at?: string
  updated_at?: string | null
  party?: { id: string; name: string } | null
}

export interface CreateEmployeeInput {
  party_id?: string
  user_id?: string
  first_name: string
  last_name: string
  document_type?: string
  document_number?: string
  position?: string
  department?: string
  hire_date?: string
  salary?: string
  currency_code?: string
  is_active?: boolean
}

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>
