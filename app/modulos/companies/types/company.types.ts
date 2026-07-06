export interface Company {
  id: string
  name: string
  taxId?: string
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

export type CreateCompanyInput = Omit<
  Company,
  'id' | 'active' | 'created_at' | 'updated_at'
>

export type UpdateCompanyInput = Partial<CreateCompanyInput>
