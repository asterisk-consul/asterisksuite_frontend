export interface Company {
  id: string
  name: string
  tax_id?: string
  vat_condition?: string
  address?: string
  phone?: string
  email?: string
  active?: boolean
  created_at?: string
  updated_at?: string
}

export interface CompanyUser {
  id: string
  company_id: string
  user_id: string
  role: string
  active?: boolean
  created_at?: string
  updated_at?: string
  user?: {
    id: string
    name: string
    email: string
  }
}

export interface AddCompanyUserDto {
  email: string
  role: string
}

export interface CreateCompanyUserDto {
  name: string
  email: string
  password: string
  role: string
}

export type CreateCompanyInput = {
  name: string
  taxId?: string
  vat_condition?: string
  address?: string
  phone?: string
  email?: string
  subdomain?: string
  schemaName?: string
}

export type UpdateCompanyInput = Partial<CreateCompanyInput>
